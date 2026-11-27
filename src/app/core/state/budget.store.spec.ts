import { TestBed } from '@angular/core/testing';
import { emptyBudget, budgetListNames } from '../../features/budget/budget-calculator';
import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import { PlannerDbService } from '../../services/planner-db.service';
import { BudgetStore } from './budget.store';

describe('BudgetStore', () => {
  const fresh = emptyBudget(DEFAULT_PLANNER_SETTINGS);
  let store: BudgetStore;
  let db: PlannerDbService;

  beforeEach(async () => {
    store = TestBed.inject(BudgetStore);
    db = TestBed.inject(PlannerDbService);
    await store.clear();
  });

  it('distinguishes an absent record from a saved zero baseline', async () => {
    expect(await store.load()).toBeNull();
    expect(await db.getBudget()).toBeUndefined();
    expect(store.monthlyHousingBaseline()).toBeNull();
    await store.save(fresh);
    expect(store.monthlyHousingBaseline()).toBe(0);
    expect((await db.getBudget())?.key).toBe('user-budget');
  });

  it('retains list order and preserves createdAt through queued updates', async () => {
    const items = [{ id: 8, name: 'First', amount: 0 }, { id: 2, name: 'Second', amount: 100 }];
    const inputs = {
      ...fresh,
      payDeductions: items,
      monthlyExpenses: items,
      annualExpenses: items,
      monthlyHousingExpenses: items,
      annualHousingExpenses: items,
    };
    await store.save(inputs);
    const original = store.saved()!;
    await Promise.all([store.save({ ...inputs, grossIncome: 12000 }),
      store.save({ ...inputs, grossIncome: 24000 })]);
    const reopened = await store.load();
    expect(reopened?.grossIncome).toBe(24000);
    for (const list of budgetListNames) expect(reopened?.[list]).toEqual(items);
    expect(reopened?.createdAt).toBe(original.createdAt);
    expect(reopened?.updatedAt).toBe(new Date(reopened!.updatedAt).toISOString());
  });

  it('keeps the last valid record on invalid or failed saves', async () => {
    await store.save({ ...fresh, grossIncome: 12000 });
    await expectAsync(store.save({ ...fresh, anticipatedMortgageTermYears: 51 })).toBeRejected();
    const transaction = spyOn(db, 'transaction').and.rejectWith(new Error('Write failed'));
    await expectAsync(store.save({ ...fresh, grossIncome: 20000 })).toBeRejected();
    expect(store.monthlyHousingBaseline()).toBe(1000);
    transaction.and.callThrough();
    expect((await store.load())?.grossIncome).toBe(12000);
    await store.save({ ...fresh, grossIncome: 24000 });
    expect(store.monthlyHousingBaseline()).toBe(2000);
  });

  it('clears only the budget after queued saves', async () => {
    const portfolio = await db.getPortfolio(1);
    await Promise.all([store.save(fresh), store.clear()]);
    expect(await store.load()).toBeNull();
    expect(await db.getPortfolio(1)).toEqual(portfolio);
  });
});
