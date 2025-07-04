export interface PayDeduction {
  id?: number;
  name: string;
  amount: number;
  description?: string;
}

export interface Expense {
  id?: number;
  name: string;
  amount: number;
  description?: string;
}

export interface BudgetData {
  id?: number;
  grossIncome: number;
  useTwoWeekPayStub: boolean;
  payDeductions: PayDeduction[];
  annualExpenses: Expense[];
  monthlyExpenses: Expense[];
  // Mortgage-related fields
  anticipatedMortgageRate?: number;
  anticipatedMortgageTermYears?: number;
  annualHousingExpenses: Expense[];
  monthlyHousingExpenses: Expense[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BudgetCalculations {
  grossIncomeAnnual: number;
  totalDeductionsAnnual: number;
  netIncomeAnnual: number;
  netIncomeMonthly: number;
  grossIncomeMonthly: number;
  totalDeductionsMonthly: number;
  totalAnnualExpenses: number;
  totalMonthlyExpenses: number;
  totalMonthlyExpensesAnnualized: number;
  totalExpensesAnnual: number;
  availableForHousingAnnual: number;
  availableForHousingMonthly: number;
  // Housing expense calculations
  totalAnnualHousingExpenses: number;
  totalMonthlyHousingExpenses: number;
  totalMonthlyHousingExpensesAnnualized: number;
  totalHousingExpensesAnnual: number;
  totalHousingExpensesMonthly: number; // Combined monthly + annual/12
  // Mortgage calculations
  affordableMonthlyMortgagePayment?: number;
  affordableTotalMortgageAmount?: number;
  remainingMonthlyAfterMortgage?: number;
}

export interface BudgetWithCalculations extends BudgetData {
  calculations: BudgetCalculations;
}
