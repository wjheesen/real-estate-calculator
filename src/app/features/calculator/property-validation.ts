import { settingBounds } from '../../models/planner-settings';
import type { PropertyInputs } from '../../models/property-inputs';

type VariantKey<T> = T extends unknown ? keyof T : never;
export type PropertyField = VariantKey<PropertyInputs>;
export type PropertyErrors = Readonly<Partial<Record<PropertyField, string>>>;

export interface PropertyValidation {
  readonly errors: PropertyErrors;
  readonly incomplete: boolean;
}

interface Bounds {
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  readonly positive?: boolean;
  readonly optional?: boolean;
}

const percent = { min: 0, max: 100 };
const ownedPaymentError = 'Enter a monthly P&I payment above the first month’s interest, or leave it blank to estimate.';

export function validatePropertyInputs(raw: object): PropertyValidation {
  const inputs = raw as Partial<Record<PropertyField, unknown>>;
  const errors: Partial<Record<PropertyField, string>> = {};
  let incomplete = false;

  function number(key: PropertyField, bounds: Bounds = { min: 0 }): number | undefined {
    const value = inputs[key];
    if (value === undefined || value === null || value === '') {
      if (!bounds.optional) {
        errors[key] = 'Enter a value.';
        incomplete = true;
      }
      return undefined;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors[key] = 'Enter a finite number.';
    } else if (bounds.positive && value <= 0) {
      errors[key] = 'Enter a value greater than zero.';
    } else if (bounds.integer && !Number.isInteger(value)) {
      errors[key] = 'Enter a whole number.';
    } else if (bounds.min !== undefined && value < bounds.min) {
      errors[key] = `Enter a value of at least ${bounds.min}.`;
    } else if (bounds.max !== undefined && value > bounds.max) {
      errors[key] = `Enter a value of at most ${bounds.max}.`;
    } else {
      return value;
    }
    return undefined;
  }

  function flag(key: PropertyField): boolean | undefined {
    const value = inputs[key];
    if (typeof value === 'boolean') return value;
    errors[key] = 'Choose a unit or option.';
    return undefined;
  }

  const status = inputs.ownershipStatus;
  if (status !== 'to_be_purchased' && status !== 'already_owned' && status !== 'selling') {
    return { errors: { ownershipStatus: 'Choose an ownership status.' }, incomplete: true };
  }
  const price = number('purchasePrice', { min: 0, positive: status !== 'selling' });
  number('sellingCostsPercentage', settingBounds.sellingCostsPercentage);

  if (status === 'selling') {
    number('existingLoanBalance');
    return { errors, incomplete };
  }

  const hold = number('plannedHoldPeriodYears', { ...settingBounds.plannedHoldPeriodYears, optional: true });
  if (status === 'to_be_purchased') {
    const downPercentage = flag('usePercentageForDownPayment');
    number('downPayment', downPercentage ? percent : { min: 0, max: price });
    flag('financeRehabAndClosing');
    number('closingCosts');
    number('interestRate', settingBounds.interestRate);
    number('termYears', settingBounds.termInYears);
    number('paymentsPerYear', settingBounds.paymentsPerYear);
    number('mortgageInsurance', flag('usePercentageForMortgageInsurance')
      ? settingBounds.mortgageInsuranceRatePercentage : { min: 0 });
  } else {
    const balance = number('existingLoanBalance');
    const hasDebt = balance !== undefined && balance > 0;
    const rate = hasDebt ? number('interestRate', settingBounds.interestRate) : undefined;
    const payment = hasDebt ? number('existingMonthlyPI', { optional: true, positive: true }) : undefined;
    const term = number('termYears', {
      ...settingBounds.termInYears,
      optional: !hasDebt || payment !== undefined,
    });
    if (hasDebt && inputs.existingMonthlyPI != null && inputs.existingMonthlyPI !== ''
      && (payment === undefined || (rate !== undefined && payment <= balance * rate / 1200))) {
      errors.existingMonthlyPI = ownedPaymentError;
    }
    if (hold === undefined && term === undefined && !errors.plannedHoldPeriodYears && !errors.termYears) {
      errors.plannedHoldPeriodYears = 'Enter a planned hold period.';
      incomplete = true;
    }
    number('mortgageInsurance');
  }

  if (inputs.rentalIncomeMode === 'long_term') {
    number('expectedRentalIncome');
  } else if (inputs.rentalIncomeMode === 'short_term') {
    number('nightlyRate');
    number('occupancyRatePercentage', percent);
  } else {
    errors.rentalIncomeMode = 'Choose a rental income mode.';
  }
  number('rehabCosts');
  number('insuranceCost');
  number('propertyTaxes');
  number('monthlyHOA');
  number('monthlyUtilities');
  number('operatingExpenses', flag('usePercentageForOpex') ? percent : { min: 0 });
  number('capitalExpenditures', flag('usePercentageForCapex') ? percent : { min: 0 });
  number('appreciationRate', settingBounds.appreciationPercentage);
  number('scheduleEDeductibleAmount');
  number('rentalUsePercentage', percent);
  return { errors, incomplete };
}

export class PropertyValidationError extends Error {
  constructor(readonly fields: PropertyErrors) {
    super(`Invalid property inputs: ${Object.keys(fields).join(', ')}.`);
    this.name = 'PropertyValidationError';
  }
}
