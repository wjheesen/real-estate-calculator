import type { PlannerPortfolio } from '../../../models/planner-records';
import { ArchiveValidationError, readCsv, writeCsv } from '../csv-utils';

const file = 'portfolios.csv';
const columns = ['id', 'name', 'description', 'createdAt', 'updatedAt'] as const;

export function encodePortfolios(portfolios: readonly PlannerPortfolio[]): string {
  return writeCsv(columns, [...portfolios].sort((a, b) => a.id - b.id)
    .map((portfolio) => columns.map((column) => portfolio[column])));
}

export function decodePortfolios(csv: string): PlannerPortfolio[] {
  const { rows } = readCsv(csv, file, columns);
  if (!rows.length) throw new ArchiveValidationError(file, 'At least one portfolio is required.');
  const ids = new Set<number>();
  const names = new Set<string>();
  return rows.map((row) => {
    const id = row.integer('id');
    const name = row.name();
    if (ids.has(id)) row.fail('id', 'Duplicate portfolio ID.');
    if (names.has(name.toLowerCase())) row.fail('name', 'Duplicate portfolio name.');
    ids.add(id);
    names.add(name.toLowerCase());
    return {
      id, name, ...row.description(),
      createdAt: row.timestamp('createdAt'), updatedAt: row.timestamp('updatedAt'),
    };
  }).sort((a, b) => a.id - b.id);
}
