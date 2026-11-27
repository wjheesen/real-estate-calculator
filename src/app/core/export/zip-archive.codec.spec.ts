import JSZip from 'jszip';
import { emptyBudget } from '../../features/budget/budget-calculator';
import { calculatePropertyResults } from '../../features/calculator/real-estate-calculator';
import type { PlannerProperty } from '../../models/planner-records';
import { DEFAULT_PLANNER_SETTINGS } from '../../models/planner-settings';
import type { ArchiveState } from './archive-state';
import { decodeBudget, encodeBudget } from './codecs/budget.codec';
import { decodePortfolios, encodePortfolios } from './codecs/portfolios.codec';
import { decodeProperties, encodeProperties } from './codecs/properties.codec';
import { decodeSettings, encodeSettings } from './codecs/settings.codec';
import { readCsv, writeCsv } from './csv-utils';
import { decodeArchive, encodeArchive } from './zip-archive.codec';

const now = '2026-01-01T00:00:00.000Z';
const later = '2026-01-02T00:00:00Z';
const timestamps = { createdAt: now, updatedAt: later };
const costs = {
  rehabCosts: 1234.567890123,
  mortgageInsurance: 0,
  insuranceCost: 0,
  propertyTaxes: 1800,
  monthlyHOA: 0,
  monthlyUtilities: 75,
  operatingExpenses: 10,
  usePercentageForOpex: true,
  capitalExpenditures: 50,
  usePercentageForCapex: false,
  appreciationRate: -3.25,
  plannedHoldPeriodYears: 10,
  scheduleEDeductibleAmount: 110000,
  rentalUsePercentage: 50,
  sellingCostsPercentage: 6,
};
const purchase = {
  ...timestamps, ...costs, id: 11, portfolioId: 1, name: 'Beach house',
  description: 'Owners wrote, "Keep it."\r\nWinter only\nSecond line.',
  ownershipStatus: 'to_be_purchased', purchasePrice: 200000,
  closingCosts: 5678.3, downPayment: 19.9, usePercentageForDownPayment: true,
  financeRehabAndClosing: true, interestRate: 0, termYears: 30, paymentsPerYear: 26,
  usePercentageForMortgageInsurance: true,
  rentalIncomeMode: 'short_term', nightlyRate: 120, occupancyRatePercentage: 50,
} as const satisfies PlannerProperty;
const owned = {
  ...timestamps, ...costs, id: 12, portfolioId: 8, name: 'Home',
  ownershipStatus: 'already_owned', purchasePrice: 300000,
  existingLoanBalance: 120000, existingMonthlyPI: 600.01, interestRate: 6, termYears: 30,
  rentalIncomeMode: 'long_term', expectedRentalIncome: 1000,
  operatingExpenses: 500, usePercentageForOpex: false, capitalExpenditures: 5, usePercentageForCapex: true,
} as const satisfies PlannerProperty;
const sale = {
  ...timestamps, id: 13, portfolioId: 8, name: 'Underwater home',
  ownershipStatus: 'selling', purchasePrice: 200000, existingLoanBalance: 205000, sellingCostsPercentage: 6,
} as const satisfies PlannerProperty;
const dollarPurchase = {
  ...purchase, id: 14, portfolioId: 8, name: 'Purchase with cash inputs',
  downPayment: 20000, usePercentageForDownPayment: false,
  financeRehabAndClosing: false, mortgageInsurance: 420, usePercentageForMortgageInsurance: false,
};
const state: ArchiveState = {
  portfolios: [
    { ...timestamps, id: 1, name: 'Keep and rent', description: 'Original, "keep" scenario.' },
    { ...timestamps, id: 8, name: 'Sell and buy' },
  ],
  properties: [purchase, owned, sale, dollarPurchase],
  budget: {
    ...emptyBudget(DEFAULT_PLANNER_SETTINGS), ...timestamps,
    grossIncome: 3000, useTwoWeekPayStub: true, anticipatedMortgageRate: 0, anticipatedMortgageTermYears: 10,
    payDeductions: [{ id: 9, name: 'Withholding', amount: 600 }],
    monthlyExpenses: [{ id: 4, name: 'Groceries', amount: 599.123456789 }],
    annualExpenses: [{ id: 2, name: 'Car insurance', amount: 2400 }],
    monthlyHousingExpenses: [
      { id: 3, name: 'Utilities', amount: 75, description: 'Budget, not property' },
      { id: 1, name: 'Monthly zero', amount: 0 },
    ],
    annualHousingExpenses: [{ id: 2, name: 'Property tax', amount: 2400 }],
  },
  settings: { ...DEFAULT_PLANNER_SETTINGS, themeMode: 'dark', interestRate: 0 },
};
const metadata = { exportedAt: now, appVersion: '0.0.0' };
const parents = new Set([1, 8]);

function replaceCell(csv: string, field: string, value: string, recordIndex = 0): string {
  const { fields, rows } = readCsv(csv, 'test.csv');
  const header = [...fields];
  return writeCsv(header, rows.map((row, index) =>
    header.map((key) => key === field && index === recordIndex ? value : row.text(key))));
}

describe('the schema 2 archive codecs', () => {
  it('round-trips each codec with quoting, record ordering, explicit zero and all list positions', () => {
    expect(decodePortfolios(encodePortfolios([...state.portfolios].reverse()))).toEqual([...state.portfolios]);
    expect(decodeProperties(encodeProperties([...state.properties].reverse()), parents)).toEqual([...state.properties]);
    expect(decodeBudget(encodeBudget(state.budget))).toEqual(state.budget);
    expect(decodeBudget(encodeBudget(null))).toBeNull();
    expect(decodeSettings(encodeSettings(state.settings))).toEqual(state.settings);
    expect(decodeSettings('\ufeffinterestRate\n0\n')).toEqual({ ...DEFAULT_PLANNER_SETTINGS, interestRate: 0 });

    const csv = writeCsv(['tiny', 'large', 'description'], [[1e-11, 1e22, 'A "quote", and a\r\nline break']]);
    const { rows } = readCsv(csv, 'values.csv');
    expect(rows[0].number('tiny')).toBe(1e-11);
    expect(rows[0].number('large')).toBe(1e22);
    expect(rows[0].text('description')).toBe('A "quote", and a\r\nline break');
    expect(csv).toContain('\r\n');
  });

  it('round-trips actual raw-only ZIP bytes in canonical record order', async () => {
    const bytes = await encodeArchive({ ...state, properties: [...state.properties].reverse() }, metadata);
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file('portfolio_summaries.csv')).toBeNull();
    expect(await zip.file('properties.csv')!.async('string')).not.toContain('calc_');
    expect(JSON.parse(await zip.file('metadata.json')!.async('string'))).toEqual({
      ...metadata, schemaVersion: 2, includeCalculatedFigures: false,
    });
    expect(await decodeArchive(bytes)).toEqual(state);
  });

  it('exports spreadsheet figures and ignores changed calculated columns and summaries on restore', async () => {
    const zip = await JSZip.loadAsync(await encodeArchive(state, { ...metadata, includeCalculatedFigures: true }));
    const csv = await zip.file('properties.csv')!.async('string');
    const { fields, rows } = readCsv(csv, 'properties.csv');
    expect(rows[1].text('calc_effectiveMonthlyRent')).toBe('1000');
    expect(rows[2].text('calc_netProceedsFromSale')).toBe('-17000');
    expect(rows[2].text('calc_monthlyCashFlow')).toBe('');
    expect(zip.file('portfolio_summaries.csv')).not.toBeNull();
    const reordered = [...fields].reverse();
    zip.file('properties.csv', writeCsv(reordered, rows.map((row) => reordered.map((key) =>
      key.startsWith('calc_') ? 'ignored tampered value' : row.text(key)))));
    zip.file('portfolio_summaries.csv', 'also ignored');
    const decoded = await decodeArchive(await zip.generateAsync({ type: 'uint8array' }));
    expect(decoded).toEqual(state);
    expect(calculatePropertyResults(decoded.properties[0])).toEqual(calculatePropertyResults(purchase));
  });

  it('supports absent budget and header-only properties through the archive', async () => {
    const empty = { ...state, budget: null, properties: [] };
    const bytes = await encodeArchive(empty, { ...metadata, includeCalculatedFigures: true });
    const zip = await JSZip.loadAsync(bytes);
    const summaries = readCsv(await zip.file('portfolio_summaries.csv')!.async('string'), 'portfolio_summaries.csv');
    expect(summaries.rows[0].text('monthlyBudgetFitUSD')).toBe('');
    expect(await decodeArchive(bytes)).toEqual(empty);
  });

  it('requires the owned statement payment to exceed first-month interest and preserves a blank', () => {
    const csv = encodeProperties([owned]);
    for (const amount of ['500', '600']) {
      expect(() => decodeProperties(replaceCell(csv, 'existingMonthlyPI', amount), parents))
        .toThrowError(/properties.csv, record 2, existingMonthlyPI/);
    }
    expect(decodeProperties(csv, parents)).toEqual([owned]);
    const [blank] = decodeProperties(replaceCell(csv, 'existingMonthlyPI', ''), parents);
    expect(Object.hasOwn(blank, 'existingMonthlyPI')).toBeFalse();
  });

  it('rejects duplicate keys and names, orphans, invalid raw modes, numbers, bounds, and dates', () => {
    const groups = encodePortfolios(state.portfolios);
    const properties = encodeProperties(state.properties);
    expect(() => decodePortfolios(replaceCell(groups, 'id', '1', 1))).toThrowError(/Duplicate portfolio ID/);
    expect(() => decodePortfolios(replaceCell(groups, 'name', 'KEEP AND RENT', 1))).toThrowError(/Duplicate portfolio name/);
    expect(() => decodePortfolios(replaceCell(groups, 'createdAt', '2026-02-30T12:00:00Z'))).toThrowError(/UTC ISO/);
    expect(() => decodeProperties(replaceCell(properties, 'id', '11', 1), parents)).toThrowError(/Duplicate property ID/);
    expect(() => decodeProperties(replaceCell(properties, 'portfolioId', '99'), parents)).toThrowError(/parent portfolio/);
    expect(() => decodeProperties(replaceCell(properties, 'rentalIncomeMode', 'other'), parents)).toThrowError(/rentalIncomeMode/);
    expect(() => decodeProperties(replaceCell(properties, 'purchasePrice', 'NaN'), parents)).toThrowError(/finite decimal/);
    expect(() => decodeProperties(replaceCell(properties, 'termYears', '51'), parents)).toThrowError(/termYears/);
    expect(() => decodeSettings('interestRate,interestRate\r\n5,6\r\n')).toThrowError(/Duplicate header/);
    expect(() => decodeSettings('interestRate\n\n')).toThrowError(/finite decimal/);
    expect(() => decodeSettings('themeMode\nsepia\n')).toThrowError(/themeMode/);
    expect(() => decodeSettings('themeMode\n"unfinished')).toThrowError(/Unterminated CSV quote/);
    expect(() => decodeSettings('themeMode\nlight,extra\n')).toThrowError(/number of columns/);
  });

  it('rebuilds list order by position and detects gaps, duplicate IDs, and missing BASIC rows', () => {
    const csv = encodeBudget(state.budget);
    const { fields, rows } = readCsv(csv, 'budget.csv');
    const header = [...fields];
    expect(decodeBudget(writeCsv(header, [...rows].reverse().map((row) => header.map((key) => row.text(key))))))
      .toEqual(state.budget);
    const secondHousing = rows.findIndex((row) => row.text('name') === 'Monthly zero');
    expect(() => decodeBudget(replaceCell(csv, 'position', '0', secondHousing))).toThrowError(/Positions/);
    expect(() => decodeBudget(replaceCell(csv, 'id', '3', secondHousing))).toThrowError(/Duplicate line-item ID/);
    expect(() => decodeBudget(writeCsv(header, rows.slice(1).map((row) => header.map((key) => row.text(key))))))
      .toThrowError(/require a BASIC record/);
  });

  it('rejects corrupt bytes, missing members, malformed metadata and version 1', async () => {
    await expectAsync(decodeArchive(new Uint8Array([1, 2, 3]))).toBeRejectedWithError(/corrupt archive/);
    const zip = await JSZip.loadAsync(await encodeArchive(state, metadata));
    zip.remove('budget.csv');
    await expectAsync(decodeArchive(await zip.generateAsync({ type: 'uint8array' })))
      .toBeRejectedWithError(/budget.csv: Required ZIP member/);
    zip.file('metadata.json', '{not JSON');
    await expectAsync(decodeArchive(await zip.generateAsync({ type: 'uint8array' }))).toBeRejectedWithError(/Invalid JSON/);
    zip.file('metadata.json', JSON.stringify({ ...metadata, schemaVersion: 1, includeCalculatedFigures: false }));
    await expectAsync(decodeArchive(await zip.generateAsync({ type: 'uint8array' }))).toBeRejectedWithError(/schema version 2/);
  });
});
