import type { PlannerProperty } from '../../models/planner-records';
import { calculatePropertyResults } from '../calculator/real-estate-calculator';

export function aggregatePortfolio(
  portfolioId: number,
  properties: readonly PlannerProperty[],
  monthlyBudgetBaselineUSD: number | null,
) {
  const counts = { to_be_purchased: 0, already_owned: 0, selling: 0 };
  const horizons = new Set<number>();
  const invalidPropertyIds: number[] = [];
  let propertyCount = 0;
  let grossCashInvestedUSD = 0;
  let signedSaleProceedsUSD = 0;
  let monthlyCashFlowUSD = 0;
  let averageMonthlyEquityGainUSD = 0;
  let monthlyTotalReturnUSD = 0;
  let annualDepreciationUSD = 0;
  let annualTaxableIncomeUSD = 0;

  for (const property of properties) {
    if (property.portfolioId !== portfolioId) continue;

    propertyCount++;
    counts[property.ownershipStatus]++;
    const result = calculatePropertyResults(property);
    if (result.kind === 'invalid') {
      invalidPropertyIds.push(property.id);
    } else if (result.kind === 'sale') {
      signedSaleProceedsUSD += result.netSaleProceedsUSD;
    } else {
      grossCashInvestedUSD += result.totalCashInvestedUSD;
      monthlyCashFlowUSD += result.monthlyCashFlowUSD;
      averageMonthlyEquityGainUSD += result.averageMonthlyEquityGainUSD;
      monthlyTotalReturnUSD += result.monthlyTotalReturnUSD;
      annualDepreciationUSD += result.tax.annualDepreciationUSD;
      annualTaxableIncomeUSD += result.tax.annualTaxableIncomeUSD;
      horizons.add(result.holdYears);
    }
  }

  const annualCashFlowUSD = monthlyCashFlowUSD * 12;
  return {
    propertyCount,
    counts,
    grossCashInvestedUSD,
    signedSaleProceedsUSD,
    netCashRequiredUSD: grossCashInvestedUSD - signedSaleProceedsUSD,
    monthlyCashFlowUSD,
    annualCashFlowUSD,
    hasBudgetBaseline: monthlyBudgetBaselineUSD !== null,
    monthlyBudgetBaselineUSD,
    monthlyBudgetFitUSD: monthlyBudgetBaselineUSD === null ? null : monthlyBudgetBaselineUSD + monthlyCashFlowUSD,
    averageMonthlyEquityGainUSD,
    monthlyTotalReturnUSD,
    yearlyTotalReturnUSD: monthlyTotalReturnUSD * 12,
    annualCashOnCashPercentage: grossCashInvestedUSD > 0 ? 100 * (annualCashFlowUSD / grossCashInvestedUSD) : 0,
    annualDepreciationUSD,
    annualTaxableIncomeUSD,
    mixedHorizons: horizons.size > 1,
    invalidPropertyIds,
  };
}

export type PortfolioSummary = ReturnType<typeof aggregatePortfolio>;
