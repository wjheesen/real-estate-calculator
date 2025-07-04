import { Routes } from '@angular/router';
import { CalculatorComponent } from './components/calculator.component';
import { PortfoliosComponent } from './components/portfolios.component';

export const routes: Routes = [
  { path: '', redirectTo: '/calculator', pathMatch: 'full' },
  { path: 'calculator', component: CalculatorComponent },
  { path: 'portfolios', component: PortfoliosComponent },
  { path: 'portfolio/:id', component: PortfoliosComponent }
];
