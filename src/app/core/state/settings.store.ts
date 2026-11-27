import { Injectable, inject, signal } from '@angular/core';
import type { PlannerSettings } from '../../models/planner-records';
import {
  calculationSettings,
  DEFAULT_PLANNER_SETTINGS,
  isThemeMode,
  isValidSetting,
  type PlannerPreferences,
} from '../../models/planner-settings';
import { PlannerDbService } from '../../services/planner-db.service';
import { PlannerOperations } from './planner-operations';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly db = inject(PlannerDbService);
  private readonly current = signal<Readonly<PlannerPreferences>>(DEFAULT_PLANNER_SETTINGS);
  private readonly operations = inject(PlannerOperations);

  readonly settings = this.current.asReadonly();

  load(): Promise<void> {
    return this.operations.read(() => this.commit({}));
  }

  save(partial: Readonly<Partial<PlannerPreferences>>): Promise<void> {
    const patch: Partial<PlannerPreferences> = {};
    for (const key of calculationSettings) {
      if (!(key in partial)) continue;
      const value = partial[key];
      if (!isValidSetting(key, value)) return Promise.reject(new RangeError(`Invalid setting: ${key}`));
      patch[key] = value;
    }
    if ('themeMode' in partial) {
      if (!isThemeMode(partial.themeMode)) return Promise.reject(new RangeError('Invalid theme mode.'));
      patch.themeMode = partial.themeMode;
    }
    return this.operations.write(() => this.commit(patch));
  }

  resetToDefaults(): Promise<void> {
    return this.save(DEFAULT_PLANNER_SETTINGS);
  }

  publishCommitted(settings: Readonly<PlannerPreferences>): void {
    this.current.set(Object.freeze({ ...settings }));
  }

  private async commit(patch: Readonly<Partial<PlannerPreferences>>): Promise<void> {
    const saved = await this.db.updateSettings((record) => {
      const { theme, ...fields } = record ?? { key: 'app-settings' };
      const next: PlannerSettings & PlannerPreferences = {
        ...fields,
        ...effectiveSettings(record),
        ...patch,
        key: 'app-settings',
      };

      if (record && theme === undefined && record.themeMode === next.themeMode
        && calculationSettings.every((key) => record[key] === next[key])) {
        return record;
      }
      return next;
    });
    this.publishCommitted(effectiveSettings(saved));
  }
}

export function effectiveSettings(record: PlannerSettings | undefined): PlannerPreferences {
  const settings = { ...DEFAULT_PLANNER_SETTINGS };
  for (const key of calculationSettings) settings[key] = record?.[key] ?? settings[key];
  const mode = isThemeMode(record?.themeMode) ? record.themeMode : record?.theme;
  if (isThemeMode(mode)) settings.themeMode = mode;
  return settings;
}
