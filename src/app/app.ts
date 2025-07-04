import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DataExportService } from './services/data-export.service';
import { BudgetService } from './services/budget.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'Real Estate Investment Calculator';
  
  private dataExportService = inject(DataExportService);
  private budgetService = inject(BudgetService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  
  exportImportInProgress = false;

  get isDataExportAvailable(): boolean {
    return this.dataExportService.isFileOperationAvailable();
  }

  navigateToBudget(): void {
    this.budgetService.getBudget().pipe(take(1)).subscribe(budget => {
      if (budget) {
        // Check if we have expense data to determine which page to show
        const hasExpenses = (budget.annualExpenses && budget.annualExpenses.length > 0) || 
                           (budget.monthlyExpenses && budget.monthlyExpenses.length > 0);
        
        if (hasExpenses) {
          // Has both income and expenses - go to final summary
          this.router.navigate(['/budget-final']);
        } else {
          // Has income but no expenses - go to expense entry
          this.router.navigate(['/budget-summary']);
        }
      } else {
        // No budget data - go to income entry
        this.router.navigate(['/budget']);
      }
    });
  }

  isBudgetActive(): boolean {
    return this.router.url.includes('/budget');
  }

  /**
   * Export portfolio data and settings as ZIP file
   */
  exportData(): void {
    if (this.exportImportInProgress) return;
    
    this.exportImportInProgress = true;
    this.dataExportService.exportData().subscribe({
      next: () => {
        this.snackBar.open('All application data and settings exported as ZIP file successfully!', 'Close', { duration: 3000 });
        this.exportImportInProgress = false;
      },
      error: (error: any) => {
        this.snackBar.open(`Export failed: ${error.message}`, 'Close', { duration: 5000 });
        this.exportImportInProgress = false;
      }
    });
  }

  /**
   * Import portfolio data and settings from ZIP file
   */
  importData(): void {
    if (this.exportImportInProgress) return;
    
    if (!confirm('This will replace all current portfolio data and settings. Are you sure you want to continue?')) {
      return;
    }
    
    this.exportImportInProgress = true;
    this.dataExportService.importData().subscribe({
      next: () => {
        this.snackBar.open('All application data and settings imported from ZIP file successfully!', 'Close', { duration: 3000 });
        this.exportImportInProgress = false;
        // Reload the page to reflect imported data
        window.location.reload();
      },
      error: (error: any) => {
        this.snackBar.open(`Import failed: ${error.message}`, 'Close', { duration: 5000 });
        this.exportImportInProgress = false;
      }
    });
  }
}
