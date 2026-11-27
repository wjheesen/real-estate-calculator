import { calculatePropertyResults, roundToHundredth } from '../../../features/calculator/real-estate-calculator';
import { validatePropertyInputs, type PropertyField } from '../../../features/calculator/property-validation';
import type { PlannerProperty } from '../../../models/planner-records';
import type { PropertyInputs } from '../../../models/property-inputs';
import { propertyRecordInputs } from '../../../models/property-record-shape';
import { ArchiveValidationError, readCsv, writeCsv } from '../csv-utils';

const file = 'properties.csv';
const columns = [
  'id', 'portfolioId', 'name', 'description', 'createdAt', 'updatedAt',
  'ownershipStatus', 'purchasePrice', 'existingLoanBalance', 'sellingCostsPercentage',
  'rehabCosts', 'closingCosts', 'downPayment', 'usePercentageForDownPayment', 'financeRehabAndClosing',
  'interestRate', 'termYears', 'paymentsPerYear', 'existingMonthlyPI', 'insuranceCost', 'propertyTaxes',
  'mortgageInsurance', 'usePercentageForMortgageInsurance', 'monthlyHOA', 'monthlyUtilities',
  'rentalIncomeMode', 'expectedRentalIncome', 'nightlyRate', 'occupancyRatePercentage',
  'operatingExpenses', 'usePercentageForOpex', 'capitalExpenditures', 'usePercentageForCapex',
  'appreciationRate', 'plannedHoldPeriodYears', 'scheduleEDeductibleAmount', 'rentalUsePercentage',
] as const;
const calculated = [
  'calc_effectiveMonthlyRent', 'calc_monthlyCashFlow', 'calc_totalCashInvested', 'calc_cashOnCashReturn',
  'calc_netProceedsFromSale', 'calc_annualDepreciation', 'calc_taxableIncome',
] as const;
const booleans: ReadonlySet<string> = new Set([
  'usePercentageForDownPayment', 'financeRehabAndClosing', 'usePercentageForMortgageInsurance',
  'usePercentageForOpex', 'usePercentageForCapex',
]);
const modes: ReadonlySet<string> = new Set(['ownershipStatus', 'rentalIncomeMode']);

export function encodeProperties(properties: readonly PlannerProperty[], includeFigures = false): string {
  return writeCsv(
    includeFigures ? [...columns, ...calculated] : columns,
    [...properties].sort((a, b) => a.id - b.id).map((property) => {
      const raw: Partial<Record<typeof columns[number], string | number | boolean>> = {
        ...propertyRecordInputs(property),
        id: property.id, portfolioId: property.portfolioId, name: property.name, description: property.description,
        createdAt: property.createdAt, updatedAt: property.updatedAt,
      };
      const row = columns.map((column) => raw[column]);
      if (!includeFigures) return row;
      const r = calculatePropertyResults(property);
      if (r.kind === 'invalid') {
        throw new ArchiveValidationError(file, `Cannot calculate property ${property.id}.`);
      }
      if (r.kind === 'sale') {
        return [...row, undefined, undefined, undefined, undefined, roundToHundredth(r.netSaleProceedsUSD), undefined, undefined];
      }
      return [...row, ...[
        r.monthlyRentalIncomeUSD, r.monthlyCashFlowUSD, r.totalCashInvestedUSD, r.annualCashOnCashPercentage,
        r.exit.netProceedsUSD, r.tax.annualDepreciationUSD, r.tax.annualTaxableIncomeUSD,
      ].map(roundToHundredth)];
    }),
  );
}

export function decodeProperties(csv: string, parents: ReadonlySet<number>): PlannerProperty[] {
  const { rows } = readCsv(csv, file, columns);
  const ids = new Set<number>();
  return rows.map((row) => {
    const id = row.integer('id');
    const portfolioId = row.integer('portfolioId');
    if (ids.has(id)) row.fail('id', 'Duplicate property ID.');
    if (!parents.has(portfolioId)) row.fail('portfolioId', 'The parent portfolio is missing.');
    ids.add(id);

    const raw: Partial<Record<PropertyField, string | number | boolean>> = {};
    for (const field of columns.slice(6) as readonly PropertyField[]) {
      if (row.text(field) === '') continue;
      raw[field] = modes.has(field) ? row.text(field) : booleans.has(field) ? row.boolean(field) : row.number(field);
    }
    const [error] = Object.entries(validatePropertyInputs(raw).errors);
    if (error) row.fail(error[0], error[1]);
    return {
      ...propertyRecordInputs(raw as PropertyInputs),
      id, portfolioId, name: row.name(), ...row.description(),
      createdAt: row.timestamp('createdAt'), updatedAt: row.timestamp('updatedAt'),
    };
  }).sort((a, b) => a.id - b.id);
}
