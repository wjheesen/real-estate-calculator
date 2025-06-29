export interface Settings {
  interestRate: number;
  downPaymentPercentage: number;
  termInYears: number;
  paymentsPerYear: number;
  operatingExpensesPercentage: number;
  capitalExpendituresPercentage: number;
  mortgageInsuranceRatePercentage: number;
  appreciationPercentage: number;
}

export const DEFAULT_SETTINGS: Settings = {
  interestRate: 6.5,
  downPaymentPercentage: 20,
  termInYears: 30,
  paymentsPerYear: 12,
  operatingExpensesPercentage: 10,
  capitalExpendituresPercentage: 5,
  mortgageInsuranceRatePercentage: 0.5,
  appreciationPercentage: 3
};
