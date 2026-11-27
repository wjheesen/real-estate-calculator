import type { KpiTile } from '../../shared/components/kpi-strip/kpi-strip.component';
import { roundToHundredth, type PropertyResults } from './real-estate-calculator';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fixed = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatUsd(value: number): string {
  return usd.format(roundToHundredth(value));
}

export function formatPercentage(value: number): string {
  return `${fixed.format(roundToHundredth(value))}%`;
}

export function signedTone(value: number): KpiTile['tone'] {
  return value < 0 ? 'negative' : value > 0 ? 'positive' : 'neutral';
}

export function calculatorTiles(result: PropertyResults): readonly KpiTile[] {
  if (result.kind === 'sale') {
    return [
      { label: 'Sale price', value: formatUsd(result.salePriceUSD), tone: 'neutral' },
      { label: 'Selling costs and payoff', value: formatUsd(result.totalOutflowsUSD), tone: 'neutral' },
      { label: 'Net sale proceeds', value: formatUsd(result.netSaleProceedsUSD), tone: signedTone(result.netSaleProceedsUSD) },
      { label: 'Cash-to-close offset', value: formatUsd(result.cashToCloseOffsetUSD), highlight: true,
        subtitle: result.cashToCloseOffsetUSD < 0 ? 'Sale shortfall' : 'Funds available from sale',
        tone: signedTone(result.cashToCloseOffsetUSD) },
    ];
  }
  return [
    { label: 'Monthly cash flow', value: formatUsd(result.monthlyCashFlowUSD), highlight: true,
      subtitle: `${formatUsd(result.annualCashFlowUSD)} / year`, tone: signedTone(result.monthlyCashFlowUSD) },
    { label: 'Cash invested', value: formatUsd(result.totalCashInvestedUSD),
      subtitle: `${formatUsd(result.initialLoanBalanceUSD)} loan balance`, tone: 'neutral' },
    { label: 'Annual cash-on-cash return', value: formatPercentage(result.annualCashOnCashPercentage),
      subtitle: `${formatPercentage(result.monthlyTotalReturnPercentage)} monthly total return${result.totalCashInvestedUSD === 0 ? ' · $0 cash invested' : ''}`,
      tone: signedTone(result.annualCashOnCashPercentage) },
    { label: `Average monthly equity gain over ${result.holdYears} years`,
      value: formatUsd(result.averageMonthlyEquityGainUSD), tone: signedTone(result.averageMonthlyEquityGainUSD) },
  ];
}
