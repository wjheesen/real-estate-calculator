export interface RealEstateCalculation {
  id?: number;
  purchasePrice: number;
  rehabCosts: number;
  closingCosts: number;
  downPayment: number;
  usePercentageForDownPayment: boolean;
  interestRate: number;
  termYears: number;
  paymentsPerYear: number;
  insuranceCost: number;
  mortgageInsurance: number;
  usePercentageForMortgageInsurance: boolean;
  propertyTaxes: number;
  expectedRentalIncome: number;
  operatingExpenses: number;
  usePercentageForOpex: boolean;
  capitalExpenditures: number;
  usePercentageForCapex: boolean;
  appreciationRate: number;
  // Tax-related fields
  scheduleEDeductibleAmount: number;
  rentalUsePercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CalculationResults {
  totalAcquisitionCost: number;
  downPaymentAmount: number;
  loanAmount: number;
  monthlyMortgagePayment: number;
  monthlyOperatingExpenses: number;
  monthlyCapitalExpenditures: number;
  monthlyInsurance: number;
  monthlyMortgageInsurance: number;
  monthlyPropertyTaxes: number;
  totalMonthlyExpenses: number;
  monthlyIncomeAfterExpenses: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCashReturn: number;
  futurePropertyValue: number;
  totalCashInvested: number;
  totalProfit: number;
  totalROI: number;
  netProceedsFromSale: number;
  sellingCosts: number;
  // New return calculations
  monthlyEquityGain: number;
  monthlyTotalReturn: number;
  monthlyReturnPercentage: number;
  yearlyEquityGain: number;
  yearlyTotalReturn: number;
  yearlyReturnPercentage: number;
  // Tax calculations
  annualDepreciation: number;
  taxableIncome: number;
  pretaxIncome: number;
}

export interface SavedCalculation extends RealEstateCalculation {
  name: string;
  description?: string;
  results?: CalculationResults;
}
