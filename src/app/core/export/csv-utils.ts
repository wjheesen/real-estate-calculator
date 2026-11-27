export class ArchiveValidationError extends Error {
  constructor(
    readonly file: string,
    message: string,
    readonly record?: number,
    readonly field?: string,
  ) {
    const location = [file, record === undefined ? '' : `record ${record}`, field].filter(Boolean).join(', ');
    super(`${location}: ${message}`);
    this.name = 'ArchiveValidationError';
  }
}

type CsvValue = string | number | boolean | null | undefined;
const decimalPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i;

function decimal(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError('CSV numbers must be finite.');
  const text = String(value);
  const [mantissa, exponent] = text.split('e');
  if (exponent === undefined) return text;
  const [whole, fraction = ''] = mantissa.replace(/^-/, '').split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  const expanded = point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return value < 0 ? '-' + expanded : expanded;
}

function csvCell(value: CsvValue): string {
  const text = typeof value === 'number' ? decimal(value) : String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function writeCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function parseRows(input: string, file: string): string[][] {
  const text = input.replace(/^\ufeff/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let state: 'start' | 'plain' | 'quoted' | 'closed' = 'start';

  function endCell(): void {
    row.push(cell);
    cell = '';
    state = 'start';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (state === 'quoted') {
      if (char === '"') state = 'closed';
      else cell += char;
    } else if (state === 'closed' && char === '"') {
      cell += '"';
      state = 'quoted';
    } else if (char === ',') {
      endCell();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r') {
        if (text[i + 1] !== '\n') throw new ArchiveValidationError(file, 'Use LF or CRLF record endings.', records.length + 1);
        i++;
      }
      endCell();
      records.push(row);
      row = [];
    } else if (state === 'start' && char === '"') {
      state = 'quoted';
    } else if (state === 'closed' || char === '"') {
      throw new ArchiveValidationError(file, 'Malformed CSV quote.', records.length + 1);
    } else {
      cell += char;
      state = 'plain';
    }
  }
  if (state === 'quoted') throw new ArchiveValidationError(file, 'Unterminated CSV quote.', records.length + 1);
  if (state !== 'start' || row.length) {
    endCell();
    records.push(row);
  }
  return records;
}

export function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis)
    && new Date(millis).toISOString() === `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
}

export class CsvRow {
  constructor(
    readonly file: string,
    readonly record: number,
    private readonly values: ReadonlyMap<string, string>,
  ) {}

  has(field: string): boolean {
    return this.values.has(field);
  }

  text(field: string): string {
    return this.values.get(field) ?? '';
  }

  fail(field: string, message: string): never {
    throw new ArchiveValidationError(this.file, message, this.record, field);
  }

  name(field = 'name'): string {
    const value = this.text(field).trim();
    return value || this.fail(field, 'A name is required.');
  }

  description(): { description?: string } {
    const value = this.text('description');
    return value.trim() ? { description: value } : {};
  }

  number(field: string): number {
    const text = this.text(field);
    const value = Number(text);
    if (!decimalPattern.test(text) || !Number.isFinite(value)) this.fail(field, 'Enter a finite decimal number.');
    return value;
  }

  integer(field: string, allowZero = false): number {
    const text = this.text(field);
    const value = Number(text);
    if (!/^(0|[1-9]\d*)$/.test(text) || !Number.isSafeInteger(value) || (!allowZero && value === 0)) {
      this.fail(field, `Enter a ${allowZero ? 'nonnegative' : 'positive'} safe integer.`);
    }
    return value;
  }

  boolean(field: string): boolean {
    const value = this.text(field);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return this.fail(field, 'Enter true or false.');
  }

  timestamp(field: string): string {
    const value = this.text(field);
    if (!isUtcTimestamp(value)) this.fail(field, 'Enter a UTC ISO timestamp.');
    return value;
  }

  empty(fields: readonly string[]): void {
    for (const field of fields) {
      if (this.text(field) !== '') this.fail(field, 'This field must be blank for this record.');
    }
  }
}

export function readCsv(input: string, file: string, required: readonly string[] = []) {
  const [header, ...records] = parseRows(input, file);
  if (!header || header.some((field) => field === '')) {
    throw new ArchiveValidationError(file, 'A nonempty header is required.', 1);
  }
  const fields = new Set<string>();
  for (const field of header) {
    if (fields.has(field)) throw new ArchiveValidationError(file, 'Duplicate header.', 1, field);
    fields.add(field);
  }
  for (const field of required) {
    if (!fields.has(field)) throw new ArchiveValidationError(file, 'Missing required column.', 1, field);
  }

  const rows = records.map((values, index) => {
    if (values.length !== header.length) {
      throw new ArchiveValidationError(file, 'Unexpected number of columns.', index + 2);
    }
    return new CsvRow(file, index + 2, new Map(header.map((field, column) => [field, values[column]])));
  });
  return { fields, rows };
}
