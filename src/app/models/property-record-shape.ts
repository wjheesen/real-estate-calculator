import type { PropertyInputs } from './property-inputs';

function numericFields<K extends string>(
  raw: Record<string, unknown>,
  keys: readonly K[],
): Record<K, number> {
  const fields = {} as Record<K, number>;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${key} must be a finite number.`);
    }
    fields[key] = value;
  }
  return fields;
}

function optionalNumber<K extends string>(raw: Record<string, unknown>, key: K): Partial<Record<K, number>> {
  return raw[key] === undefined ? {} : numericFields(raw, [key]);
}

function booleanFields<K extends string>(
  raw: Record<string, unknown>,
  keys: readonly K[],
): Record<K, boolean> {
  const fields = {} as Record<K, boolean>;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
    fields[key] = value;
  }
  return fields;
}

/** Copy the active raw fields without IDs, timestamps, inactive modes or derived values. */
export function propertyRecordInputs(inputs: PropertyInputs): PropertyInputs {
  const raw = { ...inputs };
  const status = inputs.ownershipStatus;
  const valuation = numericFields(raw, ['purchasePrice', 'sellingCostsPercentage']);
  if (status === 'selling') {
    return { ownershipStatus: status, ...valuation, ...numericFields(raw, ['existingLoanBalance']) };
  }
  if (status !== 'already_owned' && status !== 'to_be_purchased') {
    throw new TypeError('Choose a valid ownership status.');
  }

  const mode = inputs.rentalIncomeMode;
  if (mode !== 'long_term' && mode !== 'short_term') throw new TypeError('Choose a valid rental income mode.');
  const income = mode === 'long_term'
    ? { rentalIncomeMode: mode as 'long_term', ...numericFields(raw, ['expectedRentalIncome']) }
    : { rentalIncomeMode: mode as 'short_term', ...numericFields(raw, ['nightlyRate', 'occupancyRatePercentage']) };
  const operating = {
    ...valuation,
    ...income,
    ...numericFields(raw, [
      'rehabCosts', 'insuranceCost', 'propertyTaxes', 'monthlyHOA', 'monthlyUtilities',
      'operatingExpenses', 'capitalExpenditures', 'appreciationRate', 'scheduleEDeductibleAmount',
      'rentalUsePercentage', 'mortgageInsurance',
    ]),
    ...booleanFields(raw, ['usePercentageForOpex', 'usePercentageForCapex']),
    ...optionalNumber(raw, 'plannedHoldPeriodYears'),
  };

  if (status === 'already_owned') {
    return {
      ...operating,
      ownershipStatus: status,
      ...numericFields(raw, ['existingLoanBalance']),
      ...optionalNumber(raw, 'interestRate'),
      ...optionalNumber(raw, 'termYears'),
      ...optionalNumber(raw, 'existingMonthlyPI'),
    };
  }
  return {
    ...operating,
    ownershipStatus: status,
    ...numericFields(raw, ['closingCosts', 'downPayment', 'interestRate', 'termYears', 'paymentsPerYear']),
    ...booleanFields(raw, ['usePercentageForDownPayment', 'financeRehabAndClosing', 'usePercentageForMortgageInsurance']),
  };
}
