import { TestBed } from '@angular/core/testing';
import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import { PlannerDbService } from '../../services/planner-db.service';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let db: PlannerDbService;
  let store: SettingsStore;

  beforeEach(async () => {
    db = TestBed.inject(PlannerDbService);
    store = TestBed.inject(SettingsStore);
    await db.transaction('settings', 'readwrite', (records) => records.clear());
  });

  it('seeds a missing record and leaves the default theme set to system', async () => {
    await store.load();
    expect(store.settings()).toEqual(jasmine.objectContaining(DEFAULT_PLANNER_SETTINGS));
    expect(await db.getSettings()).toEqual({ key: 'app-settings', ...DEFAULT_PLANNER_SETTINGS });
  });

  it('fills missing values and upgrades the T-01 theme while preserving zero and other fields', async () => {
    await db.transaction('settings', 'readwrite', (records) => records.put({
      key: 'app-settings', theme: 'dark', interestRate: 0, extraField: 42,
    }));
    await store.load();
    const expected = {
      key: 'app-settings', ...DEFAULT_PLANNER_SETTINGS, interestRate: 0, themeMode: 'dark', extraField: 42,
    } as const;
    expect(await db.getSettings()).toEqual(expected);
  });

  it('serializes concurrent partial updates and reloads the merged values', async () => {
    await Promise.all([store.load(), store.save({ interestRate: 7 }), store.save({ themeMode: 'dark' })]);
    TestBed.resetTestingModule();
    const reopened = TestBed.inject(SettingsStore);
    await reopened.load();
    expect(reopened.settings()).toEqual(jasmine.objectContaining({ interestRate: 7, themeMode: 'dark' }));
  });

  it('rejects out-of-range, fractional integer and non-finite settings', async () => {
    await store.load();
    for (const partial of [
      { interestRate: 101 }, { appreciationPercentage: -51 }, { termInYears: 1.5 },
      { paymentsPerYear: 0 }, { sellingCostsPercentage: 26 }, { interestRate: Infinity },
    ]) {
      await expectAsync(store.save(partial)).toBeRejectedWithError(RangeError);
    }
    expect(await db.getSettings()).toEqual({ key: 'app-settings', ...DEFAULT_PLANNER_SETTINGS });
  });

  it('preserves the committed settings after failure and allows retry', async () => {
    await store.load();
    const write = spyOn(db, 'updateSettings').and.rejectWith(new Error('Write failed'));
    await expectAsync(store.save({ interestRate: 7 })).toBeRejected();
    expect(store.settings().interestRate).toBe(6.5);
    write.and.callThrough();
    await store.save({ interestRate: 7 });
    expect(store.settings().interestRate).toBe(7);
  });
});
