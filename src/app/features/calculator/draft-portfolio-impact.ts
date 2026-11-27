import type { PlannerProperty } from '../../models/planner-records';
import { aggregatePortfolio } from '../portfolios/portfolio-aggregator';

export interface ImpactMetric {
  readonly saved: number | null;
  readonly draft: number | null;
  readonly delta: number | null;
}

export interface DraftPortfolioImpact {
  readonly cashFlow: ImpactMetric;
  readonly budgetFit: ImpactMetric;
  readonly hasBudget: boolean;
  readonly incomplete: boolean;
}

function change(saved: number | null, draft: number | null): ImpactMetric {
  return { saved, draft, delta: saved === null || draft === null ? null : draft - saved };
}

export function calculateDraftPortfolioImpact(
  saved: PlannerProperty,
  properties: readonly PlannerProperty[],
  monthlyBaseline: number | null,
  draft?: PlannerProperty,
): DraftPortfolioImpact {
  const parent = saved.portfolioId;
  const committed = aggregatePortfolio(parent, properties, monthlyBaseline);
  const preview = draft && aggregatePortfolio(parent, properties.map((record) =>
    record.id === saved.id && record.portfolioId === parent ? { ...draft, id: saved.id, portfolioId: parent } : record,
  ), monthlyBaseline);
  return {
    cashFlow: change(committed.monthlyCashFlowUSD, preview?.monthlyCashFlowUSD ?? null),
    budgetFit: change(committed.monthlyBudgetFitUSD, preview?.monthlyBudgetFitUSD ?? null),
    hasBudget: monthlyBaseline !== null,
    incomplete: draft === undefined,
  };
}
