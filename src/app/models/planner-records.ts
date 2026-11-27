import type { BudgetData } from './budget.interface';
import type { Portfolio, RealEstateCalculation } from './real-estate.interface';
import type { Settings } from './settings.interface';

export type ThemePreference = 'light' | 'dark';

export interface PlannerSettings extends Partial<Settings> {
  key: 'app-settings';
  theme?: ThemePreference;
}

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface PlannerBudget extends Omit<BudgetData, 'id' | keyof Timestamps>, Timestamps {
  key: 'user-budget';
}

export interface PlannerPortfolio extends Omit<Portfolio, 'id' | keyof Timestamps>, Timestamps {
  id: number;
}

export interface PlannerProperty
  extends Omit<RealEstateCalculation, 'id' | keyof Timestamps>, Timestamps {
  id: number;
  portfolioId: number;
  name: string;
  description?: string;
}
