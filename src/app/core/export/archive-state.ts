import type { PlannerBudget, PlannerPortfolio, PlannerProperty } from '../../models/planner-records';
import type { PlannerPreferences } from '../../models/planner-settings';

export interface ArchiveState {
  readonly portfolios: readonly PlannerPortfolio[];
  readonly properties: readonly PlannerProperty[];
  readonly budget: Omit<PlannerBudget, 'key'> | null;
  readonly settings: Readonly<PlannerPreferences>;
}

export interface ArchiveMetadata {
  readonly schemaVersion: 2;
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly includeCalculatedFigures: boolean;
}
