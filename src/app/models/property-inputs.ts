interface PropertyValuation {
  readonly purchasePrice: number;
  readonly sellingCostsPercentage: number;
}

type IncomeInputs =
  | { readonly rentalIncomeMode: 'long_term'; readonly expectedRentalIncome: number }
  | { readonly rentalIncomeMode: 'short_term'; readonly nightlyRate: number; readonly occupancyRatePercentage: number };

interface OperatingCosts {
  readonly rehabCosts: number;
  readonly insuranceCost: number;
  readonly propertyTaxes: number;
  readonly monthlyHOA: number;
  readonly monthlyUtilities: number;
  readonly operatingExpenses: number;
  readonly usePercentageForOpex: boolean;
  readonly capitalExpenditures: number;
  readonly usePercentageForCapex: boolean;
  readonly appreciationRate: number;
  readonly plannedHoldPeriodYears?: number;
  readonly scheduleEDeductibleAmount: number;
  readonly rentalUsePercentage: number;
}

export type PurchaseInputs = PropertyValuation & OperatingCosts & IncomeInputs & {
  readonly ownershipStatus: 'to_be_purchased';
  readonly closingCosts: number;
  readonly downPayment: number;
  readonly usePercentageForDownPayment: boolean;
  readonly financeRehabAndClosing: boolean;
  readonly interestRate: number;
  readonly termYears: number;
  readonly paymentsPerYear: number;
  readonly mortgageInsurance: number;
  readonly usePercentageForMortgageInsurance: boolean;
};

export type OwnedInputs = PropertyValuation & OperatingCosts & IncomeInputs & {
  readonly ownershipStatus: 'already_owned';
  readonly existingLoanBalance: number;
  readonly existingMonthlyPI?: number;
  readonly interestRate?: number;
  readonly termYears?: number;
  readonly mortgageInsurance: number;
};

export interface SellingInputs extends PropertyValuation {
  readonly ownershipStatus: 'selling';
  readonly existingLoanBalance: number;
}

export type PropertyInputs = PurchaseInputs | OwnedInputs | SellingInputs;

interface PropertyIdentity {
  readonly portfolioId: number;
  readonly name: string;
  readonly description?: string;
}

export type PropertyDraft = PropertyInputs & PropertyIdentity & { readonly id?: number };

export type PropertyDetails = PropertyInputs & PropertyIdentity;
