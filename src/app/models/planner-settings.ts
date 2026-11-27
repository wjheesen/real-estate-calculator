export type ThemePreference = 'light' | 'dark';
export type ThemeMode = 'system' | ThemePreference;

const calculationDefaults = {
  interestRate: 6.5,
  downPaymentPercentage: 20,
  termInYears: 30,
  paymentsPerYear: 12,
  operatingExpensesPercentage: 10,
  capitalExpendituresPercentage: 5,
  mortgageInsuranceRatePercentage: 0.5,
  appreciationPercentage: 3,
  plannedHoldPeriodYears: 10,
  sellingCostsPercentage: 6,
  defaultStrOccupancyPercentage: 65,
};

export type CalculationSetting = keyof typeof calculationDefaults;
export const calculationSettings = Object.keys(calculationDefaults) as CalculationSetting[];

export interface PlannerPreferences extends Record<CalculationSetting, number> {
  themeMode: ThemeMode;
}

export const DEFAULT_PLANNER_SETTINGS: Readonly<PlannerPreferences> = Object.freeze({
  ...calculationDefaults,
  themeMode: 'system',
});

interface SettingBounds {
  readonly min: number;
  readonly max: number;
  readonly integer?: boolean;
}

export const settingBounds: Readonly<Record<CalculationSetting, SettingBounds>> = {
  interestRate: { min: 0, max: 100 },
  downPaymentPercentage: { min: 0, max: 100 },
  termInYears: { min: 1, max: 50, integer: true },
  paymentsPerYear: { min: 1, max: 365, integer: true },
  operatingExpensesPercentage: { min: 0, max: 100 },
  capitalExpendituresPercentage: { min: 0, max: 100 },
  mortgageInsuranceRatePercentage: { min: 0, max: 10 },
  appreciationPercentage: { min: -50, max: 50 },
  plannedHoldPeriodYears: { min: 1, max: 50, integer: true },
  sellingCostsPercentage: { min: 0, max: 25 },
  defaultStrOccupancyPercentage: { min: 0, max: 100 },
};

export function isValidSetting(key: CalculationSetting, value: unknown): value is number {
  const { min, max, integer } = settingBounds[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    && (!integer || Number.isInteger(value));
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}
