import type { PlannerProperty } from '../../models/planner-records';
import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import { calculateBudget, emptyBudget } from '../budget/budget-calculator';
import { aggregatePortfolio } from './portfolio-aggregator';

const now = '2026-01-01T00:00:00.000Z';
const owned = {
  id: 1, portfolioId: 1, name: 'Home', createdAt: now, updatedAt: now,
  ownershipStatus: 'already_owned', purchasePrice: 200000, existingLoanBalance: 0,
  rehabCosts: 0, mortgageInsurance: 0, insuranceCost: 0, propertyTaxes: 0,
  monthlyHOA: 100, monthlyUtilities: 150, rentalIncomeMode: 'long_term',
  expectedRentalIncome: 0, operatingExpenses: 1750, usePercentageForOpex: false,
  capitalExpenditures: 0, usePercentageForCapex: false, appreciationRate: 0,
  plannedHoldPeriodYears: 10, sellingCostsPercentage: 6, scheduleEDeductibleAmount: 0, rentalUsePercentage: 100,
} as const satisfies PlannerProperty;
const rental: PlannerProperty = {
  ...owned, id: 2, name: 'Rental', monthlyHOA: 0, monthlyUtilities: 0,
  operatingExpenses: 0, expectedRentalIncome: 500,
};
const sale = {
  id: 3, portfolioId: 1, name: 'Sale', createdAt: now, updatedAt: now,
  ownershipStatus: 'selling', purchasePrice: 200000, existingLoanBalance: 205000, sellingCostsPercentage: 6,
} as const satisfies PlannerProperty;

describe('aggregatePortfolio', () => {
  it('uses signed cash flow and charges property utilities once, separately from benchmark costs', () => {
    const budget = { ...emptyBudget(DEFAULT_PLANNER_SETTINGS), grossIncome: 36000 };
    const baseline = calculateBudget(budget).monthlyAvailable;
    const summary = aggregatePortfolio(1, [owned, rental], baseline);
    expect(summary.monthlyCashFlowUSD).toBe(-1500);
    expect(summary.monthlyBudgetFitUSD).toBe(1500);

    const higherBenchmark = calculateBudget({
      ...budget, monthlyHousingExpenses: [{ id: 1, name: 'Benchmark utilities', amount: 250 }],
    }).monthlyAvailable;
    expect(aggregatePortfolio(1, [owned, rental], higherBenchmark).monthlyBudgetFitUSD).toBe(1500);
    expect(aggregatePortfolio(1, [{ ...owned, monthlyUtilities: 400 }, rental], baseline).monthlyBudgetFitUSD)
      .toBe(1250);
  });

  it('uses signed immediate sale proceeds only for net cash required', () => {
    const funded: PlannerProperty = { ...rental, rehabCosts: 40000, plannedHoldPeriodYears: 5 };
    const short = aggregatePortfolio(1, [funded, sale], 0);
    const surplus = aggregatePortfolio(1, [funded, { ...sale, existingLoanBalance: 128000 }], 0);
    expect(short.grossCashInvestedUSD).toBe(40000);
    expect(short.signedSaleProceedsUSD).toBe(-17000);
    expect(short.netCashRequiredUSD).toBe(57000);
    expect(surplus.signedSaleProceedsUSD).toBe(60000);
    expect(surplus.netCashRequiredUSD).toBe(-20000);
    expect(short.monthlyCashFlowUSD).toBe(500);
    expect(surplus.monthlyCashFlowUSD).toBe(short.monthlyCashFlowUSD);
    expect(short.annualCashOnCashPercentage).toBe(15);
    expect(surplus.annualCashOnCashPercentage).toBe(15);
    expect(short.counts).toEqual({ to_be_purchased: 0, already_owned: 1, selling: 1 });
  });

  it('weights cash-on-cash by invested dollars, filters parent IDs, and marks mixed holds', () => {
    const primary: PlannerProperty = { ...rental, rehabCosts: 40000, plannedHoldPeriodYears: 5 };
    const second: PlannerProperty = { ...rental, id: 4, rehabCosts: 10000 };
    const unrelated = { ...owned, id: 5, portfolioId: 2 };
    const result = aggregatePortfolio(1, [primary, second, unrelated], 0);
    expect(result.propertyCount).toBe(2);
    expect(result.annualCashFlowUSD).toBe(12000);
    expect(result.annualCashOnCashPercentage).toBe(24);
    expect(result.mixedHorizons).toBeTrue();
  });

  it('distinguishes no budget and configured zero and returns the baseline for empty portfolios', () => {
    expect(aggregatePortfolio(1, [], null).hasBudgetBaseline).toBeFalse();
    expect(aggregatePortfolio(1, [], null).monthlyBudgetFitUSD).toBeNull();
    expect(aggregatePortfolio(1, [], 0).monthlyBudgetFitUSD).toBe(0);
    expect(aggregatePortfolio(1, [], 1200).monthlyBudgetFitUSD).toBe(1200);
    expect(aggregatePortfolio(1, [], 1200).annualCashOnCashPercentage).toBe(0);
  });
});
