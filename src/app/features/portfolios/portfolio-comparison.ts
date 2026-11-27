import { formatPercentage, formatUsd } from '../calculator/calculator-formatting';
import { roundToHundredth } from '../calculator/real-estate-calculator';
import type { PortfolioSummary } from './portfolio-aggregator';
import { signedUsd } from './portfolio-formatting';

const metrics = [
  { key: 'propertyCount', label: 'Property count', unit: 'count', preference: 'neutral' },
  { key: 'grossCashInvestedUSD', label: 'Gross cash invested', unit: '$', preference: 'neutral' },
  { key: 'signedSaleProceedsUSD', label: 'Signed sale proceeds', unit: '$', preference: 'neutral' },
  { key: 'netCashRequiredUSD', label: 'Net cash required', unit: '$', preference: 'lower' },
  { key: 'monthlyCashFlowUSD', label: 'Monthly cash flow', unit: '$/month', preference: 'higher' },
  { key: 'monthlyBudgetFitUSD', label: 'Monthly Budget Fit', unit: '$/month', preference: 'higher' },
  { key: 'averageMonthlyEquityGainUSD', label: 'Average monthly equity gain', unit: '$/month', preference: 'higher' },
  { key: 'monthlyTotalReturnUSD', label: 'Monthly total return', unit: '$/month', preference: 'higher' },
  { key: 'annualCashOnCashPercentage', label: 'Annual cash-on-cash return', unit: '%', preference: 'higher' },
  { key: 'annualTaxableIncomeUSD', label: 'Estimated annual taxable income', unit: '$/year', preference: 'neutral' },
  { key: 'annualDepreciationUSD', label: 'Annual depreciation', unit: '$/year', preference: 'neutral' },
] as const;

type Unit = typeof metrics[number]['unit'];
const integers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function formatValue(value: number | null, unit: Unit): string {
  if (value === null) return '—';
  if (unit === 'count') return integers.format(value);
  return unit === '%' ? formatPercentage(value) : formatUsd(value);
}

function formatDelta(value: number | null, unit: Unit): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : '';
  if (unit === 'count') return sign + integers.format(value);
  if (unit === '%') return `${sign}${value.toFixed(2)} pp`;
  return signedUsd(value);
}

export function comparisonRows(current: PortfolioSummary, other?: PortfolioSummary) {
  return metrics.map((metric) => {
    const a = current[metric.key];
    const b = other?.[metric.key] ?? null;
    const delta = a === null || b === null ? null : roundToHundredth(b - a);
    const direction = metric.preference === 'neutral' || delta === null || delta === 0
      ? 'neutral' : (metric.preference === 'higher' ? delta > 0 : delta < 0) ? 'favorable' : 'unfavorable';
    return {
      key: metric.key, label: metric.label, unit: metric.unit,
      current: formatValue(a, metric.unit), comparison: formatValue(b, metric.unit),
      delta: formatDelta(delta, metric.unit), direction,
    };
  });
}
