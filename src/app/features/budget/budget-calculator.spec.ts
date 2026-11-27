import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import { calculateBudget, emptyBudget } from './budget-calculator';

describe('calculateBudget', () => {
  const fresh = emptyBudget(DEFAULT_PLANNER_SETTINGS);
  const item = (amount: number) => ({ id: 1, name: 'Fixture', amount });
  const biweekly = {
    ...fresh,
    grossIncome: 3000,
    useTwoWeekPayStub: true,
    payDeductions: [item(600)],
    monthlyExpenses: [item(1000)],
    annualExpenses: [item(2400)],
    monthlyHousingExpenses: [item(300)],
    annualHousingExpenses: [item(2400)],
    anticipatedMortgageRate: 0,
    anticipatedMortgageTermYears: 10,
  };

  it('annualizes biweekly income and computes the independent zero-rate benchmark', () => {
    const result = calculateBudget(biweekly);
    expect(result.annualGross).toBe(78000);
    expect(result.monthlyDeductions).toBe(1300);
    expect(result.monthlyNet).toBe(5200);
    expect(result.annualNet).toBe(62400);
    expect(result.monthlyLiving).toBe(1200);
    expect(result.monthlyAvailable).toBe(4000);
    expect(result.annualAvailable).toBe(48000);
    expect(result.monthlyBenchmarkCosts).toBe(500);
    expect(result.monthlyMortgage).toBe(3500);
    expect(result.maximumLoan).toBe(420000);
  });

  it('estimates a 6% 30-year loan for a payment of $1,000', () => {
    const result = calculateBudget({ ...fresh, grossIncome: 12000, anticipatedMortgageRate: 6 });
    expect(result.monthlyMortgage).toBe(1000);
    expect(result.maximumLoan).toBeCloseTo(166791.61, 2);
  });

  it('cuts the single-home payment while preserving the portfolio baseline', () => {
    const base = calculateBudget(biweekly);
    const higherCosts = calculateBudget({ ...biweekly, monthlyHousingExpenses: [item(400)] });
    expect(higherCosts.monthlyMortgage).toBe(base.monthlyMortgage - 100);
    expect(higherCosts.monthlyAvailable).toBe(base.monthlyAvailable);
  });

  it('preserves negative income and a signed deficit while flooring the benchmark payment', () => {
    const result = calculateBudget({
      ...fresh, grossIncome: 1200, payDeductions: [item(2400)], monthlyExpenses: [item(50)],
    });
    expect(result.monthlyNet).toBe(-100);
    expect(result.monthlyAvailable).toBe(-150);
    expect(result.monthlyMortgage).toBe(0);
    expect(result.maximumLoan).toBe(0);
  });
});
