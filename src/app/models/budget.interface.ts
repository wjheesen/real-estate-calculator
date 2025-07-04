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
}

export interface BudgetWithCalculations extends BudgetData {
  calculations: BudgetCalculations;
}
