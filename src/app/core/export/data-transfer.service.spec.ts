import { TestBed } from '@angular/core/testing';
import { emptyBudget } from '../../features/budget/budget-calculator';
import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import { PlannerDbService, requestResult, type StoreName } from '../../services/planner-db.service';
import { BudgetStore } from '../state/budget.store';
import { PortfolioStore } from '../state/portfolio.store';
import { SettingsStore } from '../state/settings.store';
import type { ArchiveState } from './archive-state';
import { DataTransferService } from './data-transfer.service';
import { decodeArchive, encodeArchive } from './zip-archive.codec';

const now = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: now, updatedAt: now };
const metadata = { appVersion: '0.0.0', exportedAt: now };
const before: ArchiveState = {
  portfolios: [{ id: 7, name: 'Dataset A', ...timestamps }],
  properties: [{
    id: 8, portfolioId: 7, name: 'A sale', ownershipStatus: 'selling',
    purchasePrice: 200000, sellingCostsPercentage: 6, existingLoanBalance: 205000, ...timestamps,
  }],
  budget: {
    ...emptyBudget(DEFAULT_PLANNER_SETTINGS), ...timestamps, grossIncome: 12000,
    monthlyHousingExpenses: [{ id: 1, name: 'Utilities', amount: 75 }],
    annualHousingExpenses: [{ id: 2, name: 'Taxes', amount: 750 }],
  },
  settings: { ...DEFAULT_PLANNER_SETTINGS, themeMode: 'dark', interestRate: 0 },
};
const after: ArchiveState = {
  portfolios: [{ id: 1234, name: 'Dataset B', ...timestamps }],
  properties: [{
    id: 4321, portfolioId: 1234, name: 'B sale', ownershipStatus: 'selling',
    purchasePrice: 300000, sellingCostsPercentage: 6, existingLoanBalance: 220000, ...timestamps,
  }],
  budget: { ...emptyBudget(DEFAULT_PLANNER_SETTINGS), ...timestamps },
  settings: { ...DEFAULT_PLANNER_SETTINGS, themeMode: 'light', interestRate: 7 },
};
const stores: StoreName[] = ['settings', 'budget', 'portfolios', 'properties'];

function rawStores(): Promise<unknown[][]> {
  return new PlannerDbService().transact(stores, 'readonly', async (tx) =>
    Promise.all(stores.map((name) => requestResult(tx.objectStore(name).getAll()))));
}

describe('DataTransferService', () => {
  let transfer: DataTransferService;
  let db: PlannerDbService;

  beforeEach(async () => {
    transfer = TestBed.inject(DataTransferService);
    db = TestBed.inject(PlannerDbService);
    await transfer.restore(await encodeArchive(before, metadata));
  });

  it('atomically restores every store, preserves IDs and advances auto-increment keys', async () => {
    await transfer.restore(await encodeArchive(after, metadata));
    expect(await decodeArchive(await transfer.export(false))).toEqual(after);
    expect(TestBed.inject(BudgetStore).monthlyHousingBaseline()).toBe(0);
    const portfolios = TestBed.inject(PortfolioStore);
    const id = await portfolios.createPortfolio('New portfolio');
    expect(id).toBeGreaterThan(1234);
    const { id: priorId, createdAt, updatedAt, ...raw } = after.properties[0];
    const next = await portfolios.saveProperty({ ...raw, name: 'New property' });
    expect(next.id).toBeGreaterThan(4321);

    await transfer.restore(await encodeArchive({ ...after, budget: null }, metadata));
    expect(await db.getBudget()).toBeUndefined();
    expect(TestBed.inject(BudgetStore).monthlyHousingBaseline()).toBeNull();
    expect(portfolios.portfolios().map(({ id }) => id)).toEqual([1234]);
  });

  it('rolls back successful clears and replacement writes after a later request aborts', async () => {
    const original = await rawStores();
    const budgets = TestBed.inject(BudgetStore);
    const portfolios = TestBed.inject(PortfolioStore);
    const settings = TestBed.inject(SettingsStore);
    const originalBudget = budgets.saved();
    const originalProperties = portfolios.properties();
    const originalSettings = settings.settings();
    const b = await encodeArchive(after, metadata);
    const add = IDBObjectStore.prototype.add;
    const reachedLaterWrite = jasmine.createSpy();
    const fault = spyOn(IDBObjectStore.prototype, 'add').and.callFake(function (
      this: IDBObjectStore, value, key,
    ) {
      const request = add.call(this, value, key);
      if (this.name === 'properties') {
        request.addEventListener('success', () => {
          reachedLaterWrite();
          this.transaction.abort();
        });
      }
      return request;
    });

    await expectAsync(transfer.restore(b)).toBeRejected();
    expect(reachedLaterWrite).toHaveBeenCalledTimes(1);
    expect(await rawStores()).toEqual(original);
    expect(budgets.saved()).toBe(originalBudget);
    expect(portfolios.properties()).toBe(originalProperties);
    expect(settings.settings()).toBe(originalSettings);
    expect(portfolios.summaries().get(7)?.netCashRequiredUSD).toBe(17000);
    expect(transfer.refreshRequired()).toBeFalse();

    fault.and.callThrough();
    await transfer.restore(b);
    expect(await decodeArchive(await transfer.export(false))).toEqual(after);
    expect(portfolios.summaries().get(1234)?.netCashRequiredUSD).toBe(-62000);
    expect(settings.settings().themeMode).toBe('light');
  });

  it('rejects invalid archives without a storage transaction and releases the operation lock', async () => {
    const transaction = spyOn(db, 'transact').and.callThrough();
    await expectAsync(transfer.restore(new Uint8Array([1, 2, 3]))).toBeRejectedWithError(/corrupt archive/);
    expect(transaction).not.toHaveBeenCalled();
    expect(await decodeArchive(await transfer.export(false))).toEqual(before);
  });

  it('drains pending writes and rejects later edits during a consistent export', async () => {
    const settings = TestBed.inject(SettingsStore);
    const prior = settings.save({ interestRate: 4 });
    const backup = transfer.export(false);
    await expectAsync(settings.save({ interestRate: 8 })).toBeRejectedWithError(/backup operation/);
    await prior;
    expect((await decodeArchive(await backup)).settings.interestRate).toBe(4);
    await settings.save({ interestRate: 8 });
    expect(settings.settings().interestRate).toBe(8);
  });

  it('distinguishes a committed restore from a failed display read and retries from storage', async () => {
    const transaction = db.transact.bind(db);
    const failRead = spyOn(db, 'transact').and.callFake((names, mode, run) =>
      mode === 'readonly' ? Promise.reject(new Error('Readback failed')) : transaction(names, mode, run));
    await expectAsync(transfer.restore(await encodeArchive(after, metadata)))
      .toBeRejectedWithError(/backup was restored/);
    expect(transfer.refreshRequired()).toBeTrue();
    expect(TestBed.inject(SettingsStore).settings().themeMode).toBe('dark');
    const snapshot = await rawStores();
    expect(snapshot[2]).toEqual([...after.portfolios]);
    await expectAsync(TestBed.inject(SettingsStore).save({ interestRate: 8 }))
      .toBeRejectedWithError(/backup operation/);

    failRead.and.callThrough();
    await transfer.refresh();
    expect(transfer.refreshRequired()).toBeFalse();
    expect(TestBed.inject(SettingsStore).settings().themeMode).toBe('light');
  });
});
