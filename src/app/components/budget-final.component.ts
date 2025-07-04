import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { BudgetService } from '../services/budget.service';
import { BudgetWithCalculations } from '../models/budget.interface';

@Component({
  selector: 'app-budget-final',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="budget-final-container">
      <!-- Income Summary Card -->
      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>attach_money</mat-icon>
            Income Summary
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="editIncome()">
              <mat-icon>edit</mat-icon>
              Edit Income
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="summary-grid" *ngIf="budget">
            <div class="summary-row">
              <span class="label">Gross Income (Annual):</span>
              <span class="value">{{ budget?.calculations?.grossIncomeAnnual | currency }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Total Deductions (Annual):</span>
              <span class="value">{{ budget?.calculations?.totalDeductionsAnnual | currency }}</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Net Income (Annual):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.netIncomeAnnual | currency }}</strong></span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Net Income (Monthly):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.netIncomeMonthly | currency }}</strong></span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Expense Summary Card -->
      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>receipt_long</mat-icon>
            Expense Summary
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="editExpenses()">
              <mat-icon>edit</mat-icon>
              Edit Expenses
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="summary-grid" *ngIf="budget">
            <div class="summary-row">
              <span class="label">Annual Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalAnnualExpenses | currency }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Monthly Expenses (Annual):</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyExpensesAnnualized | currency }}</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Total Expenses (Annual):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.totalExpensesAnnual | currency }}</strong></span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Total Expenses (Monthly):</strong></span>
              <span class="value"><strong>{{ (budget?.calculations?.totalExpensesAnnual || 0) / 12 | currency }}</strong></span>
            </div>
          </div>

          <!-- Expense Details -->
          <div class="expense-details" *ngIf="hasExpenses()">
            <mat-divider></mat-divider>
            <h4 class="details-title">Expense Breakdown</h4>
            
            <div class="expense-category" *ngIf="hasAnnualExpenses()">
              <h5>Annual Expenses:</h5>
              <div class="expense-list">
                <div class="expense-item" *ngFor="let expense of getAnnualExpenses()">
                  <span class="expense-name">{{ expense.name }}</span>
                  <span class="expense-amount">{{ expense.amount | currency }}</span>
                </div>
              </div>
            </div>

            <div class="expense-category" *ngIf="hasMonthlyExpenses()">
              <h5>Monthly Expenses:</h5>
              <div class="expense-list">
                <div class="expense-item" *ngFor="let expense of getMonthlyExpenses()">
                  <span class="expense-name">{{ expense.name }}</span>
                  <span class="expense-amount">{{ expense.amount | currency }}/month</span>
                </div>
              </div>
            </div>
          </div>

          <div class="no-expenses" *ngIf="!hasExpenses()">
            <p>No expenses added yet.</p>
            <button mat-raised-button color="accent" (click)="editExpenses()">
              Add Expenses
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Available for Housing Card -->
      <mat-card class="housing-card" *ngIf="budget">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>home</mat-icon>
            Available for Housing
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="housing-calculation">
            <div class="calculation-row">
              <span class="label">Net Income (Annual):</span>
              <span class="value positive">{{ budget?.calculations?.netIncomeAnnual | currency }}</span>
            </div>
            <div class="calculation-row">
              <span class="label">Total Expenses (Annual):</span>
              <span class="value negative">-{{ budget?.calculations?.totalExpensesAnnual | currency }}</span>
            </div>
            <mat-divider class="calculation-divider"></mat-divider>
            <div class="calculation-row result">
              <span class="label"><strong>Available for Housing (Annual):</strong></span>
              <span class="value" [class.positive]="(budget?.calculations?.availableForHousingAnnual || 0) > 0" 
                                  [class.negative]="(budget?.calculations?.availableForHousingAnnual || 0) < 0">
                <strong>{{ budget?.calculations?.availableForHousingAnnual | currency }}</strong>
              </span>
            </div>
            <div class="calculation-row result">
              <span class="label"><strong>Available for Housing (Monthly):</strong></span>
              <span class="value" [class.positive]="(budget?.calculations?.availableForHousingMonthly || 0) > 0"
                                  [class.negative]="(budget?.calculations?.availableForHousingMonthly || 0) < 0">
                <strong>{{ budget?.calculations?.availableForHousingMonthly | currency }}</strong>
              </span>
            </div>
          </div>

          <div class="housing-guidance" *ngIf="budget?.calculations?.availableForHousingMonthly">
            <mat-divider></mat-divider>
            <div class="guidance-content">
              <h4>Housing Budget Guidance</h4>
              <div class="guidance-item" *ngIf="(budget?.calculations?.availableForHousingMonthly || 0) > 0">
                <mat-icon class="guidance-icon">info</mat-icon>
                <div class="guidance-text">
                  <p><strong>Recommended maximum housing payment:</strong> {{ budget?.calculations?.availableForHousingMonthly | currency }}/month</p>
                  <p class="guidance-note">This includes mortgage/rent, utilities, insurance, taxes, and maintenance.</p>
                </div>
              </div>
              <div class="guidance-item warning" *ngIf="(budget?.calculations?.availableForHousingMonthly || 0) <= 0">
                <mat-icon class="guidance-icon">warning</mat-icon>
                <div class="guidance-text">
                  <p><strong>Warning:</strong> Your expenses exceed your net income.</p>
                  <p class="guidance-note">Consider reducing expenses before taking on housing costs.</p>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Actions -->
      <div class="actions">
        <button mat-raised-button color="warn" (click)="clearBudget()">
          <mat-icon>clear</mat-icon>
          Clear All Budget Data
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./budget-final.component.css']
})
export class BudgetFinalComponent implements OnInit, OnDestroy {
  private budgetService = inject(BudgetService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  budget: BudgetWithCalculations | null = null;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.loadBudget();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private loadBudget(): void {
    this.subscription = this.budgetService.getBudget().subscribe(budget => {
      if (budget) {
        this.budget = budget;
      } else {
        // No budget data, redirect to budget input
        this.router.navigate(['/budget']);
      }
    });
  }

  editIncome(): void {
    this.router.navigate(['/budget']);
  }

  editExpenses(): void {
    this.router.navigate(['/budget-summary']);
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
      this.router.navigate(['/budget']);
    }
  }

  // Helper methods for expenses
  hasExpenses(): boolean {
    return this.hasAnnualExpenses() || this.hasMonthlyExpenses();
  }

  hasAnnualExpenses(): boolean {
    return !!(this.budget?.annualExpenses && this.budget.annualExpenses.length > 0);
  }

  getAnnualExpenses() {
    return this.budget?.annualExpenses || [];
  }

  hasMonthlyExpenses(): boolean {
    return !!(this.budget?.monthlyExpenses && this.budget.monthlyExpenses.length > 0);
  }

  getMonthlyExpenses() {
    return this.budget?.monthlyExpenses || [];
  }
}
