import { Routes } from '@angular/router';
import { CalculatorComponent } from './components/calculator.component';
import { SavedCalculationsComponent } from './components/saved-calculations.component';
import { SettingsComponent } from './components/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: '/calculator', pathMatch: 'full' },
  { path: 'calculator', component: CalculatorComponent },
  { path: 'portfolio', component: SavedCalculationsComponent },
  { path: 'portfolio/scenario/:id', component: SavedCalculationsComponent },
  { path: 'portfolio/organize', component: SavedCalculationsComponent },
  { path: 'settings', component: SettingsComponent }
];
