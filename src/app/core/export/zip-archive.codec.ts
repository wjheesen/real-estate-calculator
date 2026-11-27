import JSZip from 'jszip';
import { calculateBudget } from '../../features/budget/budget-calculator';
import { roundToHundredth } from '../../features/calculator/real-estate-calculator';
import { aggregatePortfolio } from '../../features/portfolios/portfolio-aggregator';
import type { ArchiveMetadata, ArchiveState } from './archive-state';
import { decodeBudget, encodeBudget } from './codecs/budget.codec';
import { decodePortfolios, encodePortfolios } from './codecs/portfolios.codec';
import { decodeProperties, encodeProperties } from './codecs/properties.codec';
import { decodeSettings, encodeSettings } from './codecs/settings.codec';
import { ArchiveValidationError, isUtcTimestamp, writeCsv } from './csv-utils';

const metadataFile = 'metadata.json';

function validateMetadata(value: unknown): ArchiveMetadata {
  const metadata = value && typeof value === 'object' ? value as Partial<ArchiveMetadata> : {};
  if (metadata.schemaVersion !== 2) {
    throw new ArchiveValidationError(metadataFile, 'Only archive schema version 2 is supported.', undefined, 'schemaVersion');
  }
  if (!isUtcTimestamp(metadata.exportedAt)) {
    throw new ArchiveValidationError(metadataFile, 'Enter a UTC ISO timestamp.', undefined, 'exportedAt');
  }
  if (typeof metadata.appVersion !== 'string' || !metadata.appVersion.trim()) {
    throw new ArchiveValidationError(metadataFile, 'An app version is required.', undefined, 'appVersion');
  }
  if (typeof metadata.includeCalculatedFigures !== 'boolean') {
    throw new ArchiveValidationError(metadataFile, 'Enter true or false.', undefined, 'includeCalculatedFigures');
  }
  return {
    schemaVersion: 2, exportedAt: metadata.exportedAt,
    appVersion: metadata.appVersion, includeCalculatedFigures: metadata.includeCalculatedFigures,
  };
}

function parseMetadata(text: string): ArchiveMetadata {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ArchiveValidationError(metadataFile, 'Invalid JSON.');
  }
  return validateMetadata(value);
}

function portfolioSummaries(state: ArchiveState): string {
  const baseline = state.budget === null ? null : calculateBudget(state.budget).monthlyAvailable;
  return writeCsv(
    ['portfolioId', 'name', 'propertyCount', 'netCashRequiredUSD', 'monthlyCashFlowUSD',
      'monthlyBudgetFitUSD', 'annualCashOnCashPercentage', 'annualTaxableIncomeUSD'],
    [...state.portfolios].sort((a, b) => a.id - b.id).map((portfolio) => {
      const r = aggregatePortfolio(portfolio.id, state.properties, baseline);
      return [
        portfolio.id, portfolio.name, r.propertyCount,
        roundToHundredth(r.netCashRequiredUSD), roundToHundredth(r.monthlyCashFlowUSD),
        r.monthlyBudgetFitUSD === null ? null : roundToHundredth(r.monthlyBudgetFitUSD),
        roundToHundredth(r.annualCashOnCashPercentage), roundToHundredth(r.annualTaxableIncomeUSD),
      ];
    }),
  );
}

export function encodeArchive(
  state: ArchiveState,
  options: Omit<ArchiveMetadata, 'schemaVersion' | 'includeCalculatedFigures'> & { includeCalculatedFigures?: boolean },
): Promise<Uint8Array> {
  const metadata = validateMetadata({
    schemaVersion: 2, ...options, includeCalculatedFigures: options.includeCalculatedFigures ?? false,
  });
  const zip = new JSZip();
  zip.file(metadataFile, JSON.stringify(metadata, null, 2));
  zip.file('portfolios.csv', encodePortfolios(state.portfolios));
  zip.file('properties.csv', encodeProperties(state.properties, metadata.includeCalculatedFigures));
  zip.file('budget.csv', encodeBudget(state.budget));
  zip.file('settings.csv', encodeSettings(state.settings));
  zip.file('README.txt', [
    'Real Estate Calculator backup, schema version 2',
    'Currency values are USD. Percentages are percentage points; 6 means 6%.',
    'Property insurance, property taxes and cash mortgage insurance are annual amounts.',
    'HOA, owner-paid utilities, long-term rent, operating costs and capital reserves are monthly amounts.',
    'Where a unit flag is provided, true selects percentage and false selects USD.',
    'Budget rows specify their own pay period, month or year.',
    metadata.includeCalculatedFigures
      ? 'This archive includes calculated figures for spreadsheets. Restore recomputes these figures from the raw inputs.'
      : 'This archive contains raw input data.',
  ].join('\r\n') + '\r\n');
  if (metadata.includeCalculatedFigures) zip.file('portfolio_summaries.csv', portfolioSummaries(state));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function decodeArchive(bytes: ArrayBuffer | Uint8Array): Promise<ArchiveState> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  } catch {
    throw new ArchiveValidationError('ZIP', 'Invalid or corrupt archive.');
  }

  async function member(name: string): Promise<string> {
    const file = zip.file(name);
    if (!file) throw new ArchiveValidationError(name, 'Required ZIP member is missing.');
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(await file.async('uint8array'));
    } catch {
      throw new ArchiveValidationError(name, 'Could not read ZIP member.');
    }
  }

  parseMetadata(await member(metadataFile));
  const [portfolioCsv, propertyCsv, budgetCsv, settingsCsv] = await Promise.all([
    member('portfolios.csv'), member('properties.csv'), member('budget.csv'), member('settings.csv'),
  ]);
  const portfolios = decodePortfolios(portfolioCsv);
  const properties = decodeProperties(propertyCsv, new Set(portfolios.map(({ id }) => id)));
  return { portfolios, properties, budget: decodeBudget(budgetCsv), settings: decodeSettings(settingsCsv) };
}
