import { Routes } from '@angular/router';
import { CalculatorComponent } from './components/calculator.component';
import { PortfoliosComponent } from './components/portfolios.component';
import { BudgetComponent } from './components/budget.component';
import { BudgetSummaryComponent } from './components/budget-summary.component';
import { BudgetExpensesComponent } from './components/budget-expenses.component';
import { BudgetMortgageComponent } from './components/budget-mortgage.component';
import { BudgetFinalComponent } from './components/budget-final.component';

export const routes: Routes = [
  { path: '', redirectTo: '/calculator', pathMatch: 'full' },
  { path: 'calculator', component: CalculatorComponent },
  { path: 'portfolios', component: PortfoliosComponent },
  { path: 'portfolio/:id', component: PortfoliosComponent },
  { path: 'budget', redirectTo: '/budget-summary', pathMatch: 'full' },
  { path: 'budget-income', component: BudgetComponent },
  { path: 'budget-summary', component: BudgetSummaryComponent },
  { path: 'budget-expenses', component: BudgetExpensesComponent },
  { path: 'budget-mortgage', component: BudgetMortgageComponent },
  { path: 'budget-final', component: BudgetFinalComponent }
];
