import type { BudgetInputs } from '../../models/planner-records';
import { isValidSetting, type PlannerPreferences } from '../../models/planner-settings';
import type { LineItem } from '../../shared/utils/list-helpers';

export const budgetListNames = [
  'payDeductions', 'monthlyExpenses', 'annualExpenses', 'monthlyHousingExpenses', 'annualHousingExpenses',
] as const;

export type BudgetListName = typeof budgetListNames[number];

export function emptyBudget(defaults: Pick<PlannerPreferences, 'interestRate' | 'termInYears'>): BudgetInputs {
  return {
    grossIncome: 0,
    useTwoWeekPayStub: false,
    payDeductions: [],
    monthlyExpenses: [],
    annualExpenses: [],
    monthlyHousingExpenses: [],
    annualHousingExpenses: [],
    anticipatedMortgageRate: defaults.interestRate,
    anticipatedMortgageTermYears: defaults.termInYears,
  };
}

export function isNonNegativeAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function isValidBudget(inputs: BudgetInputs): boolean {
  return isNonNegativeAmount(inputs.grossIncome)
    && typeof inputs.useTwoWeekPayStub === 'boolean'
    && isValidSetting('interestRate', inputs.anticipatedMortgageRate)
    && isValidSetting('termInYears', inputs.anticipatedMortgageTermYears)
    && budgetListNames.every((name) => {
      const items = inputs[name];
      return new Set(items.map((item) => item.id)).size === items.length
        && items.every((item) => Number.isSafeInteger(item.id) && item.id > 0
          && item.name.trim() !== '' && isNonNegativeAmount(item.amount));
    });
}

function total(items: readonly LineItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function calculateBudget(inputs: BudgetInputs) {
  const periods = inputs.useTwoWeekPayStub ? 26 : 1;
  const annualGross = periods * inputs.grossIncome;
  const annualDeductions = periods * total(inputs.payDeductions);
  const monthlyDeductions = annualDeductions / 12;
  const monthlyNet = (annualGross - annualDeductions) / 12;
  const monthlyLiving = total(inputs.monthlyExpenses) + total(inputs.annualExpenses) / 12;
  const monthlyAvailable = monthlyNet - monthlyLiving;
  const monthlyBenchmarkCosts = total(inputs.monthlyHousingExpenses) + total(inputs.annualHousingExpenses) / 12;
  const monthlyMortgage = Math.max(0, monthlyAvailable - monthlyBenchmarkCosts);
  const rate = inputs.anticipatedMortgageRate / 1200;
  const payments = 12 * inputs.anticipatedMortgageTermYears;
  const annuityFactor = rate === 0 ? payments : -Math.expm1(-payments * Math.log1p(rate)) / rate;
  return {
    annualGross,
    monthlyDeductions,
    annualDeductions,
    monthlyNet,
    annualNet: monthlyNet * 12,
    monthlyLiving,
    annualLiving: monthlyLiving * 12,
    monthlyAvailable,
    annualAvailable: monthlyAvailable * 12,
    monthlyBenchmarkCosts,
    annualBenchmarkCosts: monthlyBenchmarkCosts * 12,
    monthlyMortgage,
    maximumLoan: monthlyMortgage * annuityFactor,
  };
}
