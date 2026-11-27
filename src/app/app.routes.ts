import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'calculator', pathMatch: 'full' },
  {
    path: 'budget',
    loadComponent: () => import('./features/budget/budget-page').then((m) => m.BudgetPage),
  },
  {
    path: 'calculator',
    loadComponent: () => import('./pages/calculator-page').then((m) => m.CalculatorPage),
  },
  {
    path: 'portfolios',
    loadComponent: () => import('./pages/portfolios-page').then((m) => m.PortfoliosPage),
  },
  {
    path: 'portfolio/:id',
    loadComponent: () => import('./pages/portfolio-page').then((m) => m.PortfolioPage),
  },
  { path: 'budget-income', redirectTo: 'budget', pathMatch: 'full' },
  { path: 'budget-expenses', redirectTo: 'budget', pathMatch: 'full' },
  { path: 'budget-mortgage', redirectTo: 'budget', pathMatch: 'full' },
];
