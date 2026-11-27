import { FormControl, FormGroup } from '@angular/forms';
import type { PlannerProperty } from '../../models/planner-records';
import type { PlannerPreferences } from '../../models/planner-settings';
import type { PropertyInputs } from '../../models/property-inputs';

export type OwnershipStatus = PropertyInputs['ownershipStatus'];
export type RentalMode = 'long_term' | 'short_term';

export function newCalculatorDraft(
  settings: Readonly<PlannerPreferences>,
  ownershipStatus: OwnershipStatus = 'to_be_purchased',
): CalculatorDraftValues {
  return {
    ownershipStatus,
    name: '',
    description: '',
    portfolioId: null,
    purchasePrice: null,
    existingLoanBalance: 0,
    existingMonthlyPI: null,
    sellingCostsPercentage: settings.sellingCostsPercentage,
    rehabCosts: 0,
    closingCosts: 0,
    downPayment: settings.downPaymentPercentage,
    usePercentageForDownPayment: true,
    financeRehabAndClosing: false,
    interestRate: settings.interestRate,
    termYears: settings.termInYears,
    paymentsPerYear: settings.paymentsPerYear,
    insuranceCost: 0,
    propertyTaxes: 0,
    mortgageInsurance: ownershipStatus === 'already_owned' ? 0 : settings.mortgageInsuranceRatePercentage,
    usePercentageForMortgageInsurance: true,
    monthlyHOA: 0,
    monthlyUtilities: 0,
    rentalIncomeMode: 'long_term',
    expectedRentalIncome: 0,
    nightlyRate: 0,
    occupancyRatePercentage: settings.defaultStrOccupancyPercentage,
    operatingExpenses: settings.operatingExpensesPercentage,
    usePercentageForOpex: true,
    capitalExpenditures: settings.capitalExpendituresPercentage,
    usePercentageForCapex: true,
    appreciationRate: settings.appreciationPercentage,
    plannedHoldPeriodYears: settings.plannedHoldPeriodYears,
    scheduleEDeductibleAmount: 0,
    rentalUsePercentage: 100,
  };
}

export interface CalculatorDraftValues {
  ownershipStatus: OwnershipStatus;
  name: string;
  description: string;
  portfolioId: number | null;
  purchasePrice: number | null;
  existingLoanBalance: number | null;
  existingMonthlyPI: number | null;
  sellingCostsPercentage: number | null;
  rehabCosts: number | null;
  closingCosts: number | null;
  downPayment: number | null;
  usePercentageForDownPayment: boolean;
  financeRehabAndClosing: boolean;
  interestRate: number | null;
  termYears: number | null;
  paymentsPerYear: number | null;
  insuranceCost: number | null;
  propertyTaxes: number | null;
  mortgageInsurance: number | null;
  usePercentageForMortgageInsurance: boolean;
  monthlyHOA: number | null;
  monthlyUtilities: number | null;
  rentalIncomeMode: RentalMode;
  expectedRentalIncome: number | null;
  nightlyRate: number | null;
  occupancyRatePercentage: number | null;
  operatingExpenses: number | null;
  usePercentageForOpex: boolean;
  capitalExpenditures: number | null;
  usePercentageForCapex: boolean;
  appreciationRate: number | null;
  plannedHoldPeriodYears: number | null;
  scheduleEDeductibleAmount: number | null;
  rentalUsePercentage: number | null;
}

export type NumericDraftKey = {
  [K in keyof CalculatorDraftValues]: CalculatorDraftValues[K] extends number | null ? K : never;
}[keyof CalculatorDraftValues];

type DraftControls = { [K in keyof CalculatorDraftValues]: FormControl<CalculatorDraftValues[K]> };

export function calculatorDraftForm(values: CalculatorDraftValues): FormGroup<DraftControls> {
  const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key, new FormControl(value, { nonNullable: true }),
  ])) as DraftControls;
  return new FormGroup(controls);
}

export function calculatorDraftFromRecord(
  settings: Readonly<PlannerPreferences>,
  record: PlannerProperty,
): CalculatorDraftValues {
  const { id, createdAt, updatedAt, ...stored } = record;
  const defaults = newCalculatorDraft(settings, record.ownershipStatus);
  return {
    ...defaults, ...stored, description: record.description ?? '',
    termYears: record.ownershipStatus === 'selling' ? defaults.termYears : record.termYears ?? null,
    plannedHoldPeriodYears: record.ownershipStatus === 'selling'
      ? defaults.plannedHoldPeriodYears : record.plannedHoldPeriodYears ?? null,
    existingMonthlyPI: record.ownershipStatus === 'already_owned' ? record.existingMonthlyPI ?? null : null,
  };
}

export function effectiveDownPayment(draft: CalculatorDraftValues): number {
  const down = draft.downPayment ?? 0;
  return draft.usePercentageForDownPayment ? (draft.purchasePrice ?? 0) * (down / 100) : down;
}

export function purchaseLoanAmount(draft: CalculatorDraftValues): number {
  const financedCosts = draft.financeRehabAndClosing ? (draft.rehabCosts ?? 0) + (draft.closingCosts ?? 0) : 0;
  return (draft.purchasePrice ?? 0) - effectiveDownPayment(draft) + financedCosts;
}

export function purchasePmiDisabled(draft: CalculatorDraftValues): boolean {
  const price = draft.purchasePrice ?? 0;
  return draft.ownershipStatus === 'to_be_purchased' && price > 0
    && (effectiveDownPayment(draft) / price >= 0.2 || purchaseLoanAmount(draft) === 0);
}

export function monthlyRentForDraft(draft: CalculatorDraftValues): number {
  return draft.rentalIncomeMode === 'long_term' ? draft.expectedRentalIncome ?? 0
    : (draft.nightlyRate ?? 0) * ((draft.occupancyRatePercentage ?? 0) / 100) * (365 / 12);
}

export function convertAmount(value: number | null, percentage: boolean, base: number): number {
  if (value === null || !Number.isFinite(value) || !Number.isFinite(base) || base <= 0) return 0;
  return percentage ? base * (value / 100) : 100 * (value / base);
}

export function activeCalculatorInputs(draft: CalculatorDraftValues): object {
  if (draft.ownershipStatus === 'already_owned' && draft.existingLoanBalance === 0) {
    return { ...draft, existingMonthlyPI: undefined, interestRate: undefined, mortgageInsurance: 0 };
  }
  if (purchasePmiDisabled(draft)) {
    const amount = draft.mortgageInsurance;
    if (amount === null || amount < 0 || !Number.isFinite(amount)
      || (draft.usePercentageForMortgageInsurance && amount > 10)) {
      return { ...draft, mortgageInsurance: 0 };
    }
  }
  return draft;
}
