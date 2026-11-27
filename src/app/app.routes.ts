import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'calculator', pathMatch: 'full' },
  {
    path: 'budget',
    loadComponent: () => import('./features/budget/budget-page').then((m) => m.BudgetPage),
  },
  {
    path: 'calculator',
    loadComponent: () => import('./features/calculator/calculator-page.component').then((m) => m.CalculatorPageComponent),
  },
  {
    path: 'portfolios',
    loadComponent: () => import('./features/portfolios/components/portfolio-grid/portfolio-grid.component')
      .then((m) => m.PortfolioGridComponent),
  },
  {
    path: 'portfolio/:id',
    loadComponent: () => import('./features/portfolios/components/portfolio-detail/portfolio-detail.component')
      .then((m) => m.PortfolioDetailComponent),
  },
  { path: 'budget-income', redirectTo: 'budget', pathMatch: 'full' },
  { path: 'budget-expenses', redirectTo: 'budget', pathMatch: 'full' },
  { path: 'budget-mortgage', redirectTo: 'budget', pathMatch: 'full' },
];
