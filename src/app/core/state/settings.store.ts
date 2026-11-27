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

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly db = inject(PlannerDbService);
  private readonly current = signal<Readonly<PlannerPreferences>>(DEFAULT_PLANNER_SETTINGS);
  private pending: Promise<void> = Promise.resolve();

  readonly settings = this.current.asReadonly();

  load(): Promise<void> {
    return this.commit({});
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
    return this.commit(patch);
  }

  resetToDefaults(): Promise<void> {
    return this.save(DEFAULT_PLANNER_SETTINGS);
  }

  private commit(patch: Readonly<Partial<PlannerPreferences>>): Promise<void> {
    const result = this.pending.then(async () => {
      const saved = await this.db.updateSettings((record) => {
        const { theme, ...fields } = record ?? { key: 'app-settings' };
        const previousMode = isThemeMode(fields.themeMode) ? fields.themeMode : theme;
        const next: PlannerSettings & PlannerPreferences = {
          ...DEFAULT_PLANNER_SETTINGS,
          ...fields,
          key: 'app-settings',
          themeMode: isThemeMode(previousMode) ? previousMode : 'system',
          ...patch,
        };
        for (const key of calculationSettings) {
          next[key] = patch[key] ?? fields[key] ?? DEFAULT_PLANNER_SETTINGS[key];
        }

        if (record && theme === undefined && record.themeMode === next.themeMode
          && calculationSettings.every((key) => record[key] === next[key])) {
          return record;
        }
        return next;
      });
      this.current.set(Object.freeze({ ...DEFAULT_PLANNER_SETTINGS, ...saved }));
    });
    this.pending = result.catch(() => undefined);
    return result;
  }
}
