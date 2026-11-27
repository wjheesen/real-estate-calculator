import {
  calculationSettings, DEFAULT_PLANNER_SETTINGS, isThemeMode, isValidSetting, type PlannerPreferences,
} from '../../../models/planner-settings';
import { ArchiveValidationError, readCsv, writeCsv } from '../csv-utils';

const file = 'settings.csv';
const columns = [...calculationSettings, 'themeMode'] as const;

export function encodeSettings(settings: Readonly<PlannerPreferences>): string {
  return writeCsv(columns, [columns.map((column) => settings[column])]);
}

export function decodeSettings(csv: string): PlannerPreferences {
  const { fields, rows } = readCsv(csv, file);
  if (!columns.some((field) => fields.has(field))) {
    throw new ArchiveValidationError(file, 'No recognized settings columns.', 1);
  }
  if (rows.length !== 1) throw new ArchiveValidationError(file, 'Exactly one settings record is required.');
  const row = rows[0];
  const result = { ...DEFAULT_PLANNER_SETTINGS };
  for (const key of calculationSettings) {
    if (!row.has(key)) continue;
    const value = row.number(key);
    if (!isValidSetting(key, value)) row.fail(key, 'The setting is out of range.');
    result[key] = value;
  }
  if (row.has('themeMode')) {
    const mode = row.text('themeMode');
    if (isThemeMode(mode)) result.themeMode = mode;
    else row.fail('themeMode', 'Enter system, light, or dark.');
  }
  return result;
}
