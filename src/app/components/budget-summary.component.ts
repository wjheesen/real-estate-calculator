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
  selector: 'app-budget-summary',
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
    <div class="budget-summary-container">
      <!-- Income Summary Card -->
      <mat-card class="income-summary-card">
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
          <div class="income-summary" *ngIf="budget">
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
      <mat-card class="expenses-summary-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>receipt</mat-icon>
            Expense Summary (excluding housing)
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="editExpenses()">
              <mat-icon>edit</mat-icon>
              Edit Expenses
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="expense-summary" *ngIf="budget">
            <div class="summary-row">
              <span class="label">Annual Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalAnnualExpenses | currency }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Monthly Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyExpenses | currency }}/month</span>
            </div>
            <div class="summary-row">
              <span class="label">Monthly Expenses (Annualized):</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyExpensesAnnualized | currency }}</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Total Annual Expenses:</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.totalExpensesAnnual | currency }}</strong></span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Available for Housing Card -->
      <mat-card class="housing-summary-card" *ngIf="budget">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>home</mat-icon>
            Available for Housing
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="housing-summary">
            <div class="summary-row">
              <span class="label">Net Income (Annual):</span>
              <span class="value">{{ budget?.calculations?.netIncomeAnnual | currency }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Total Expenses (Annual):</span>
              <span class="value">-{{ budget?.calculations?.totalExpensesAnnual | currency }}</span>
            </div>
            <mat-divider></mat-divider>
            <div class="summary-row highlight large">
              <span class="label"><strong>Available for Housing (Annual):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.availableForHousingAnnual | currency }}</strong></span>
            </div>
            <div class="summary-row highlight large">
              <span class="label"><strong>Available for Housing (Monthly):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.availableForHousingMonthly | currency }}</strong></span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Actions -->
      <div class="actions">
        <button mat-raised-button color="primary" (click)="finishExpenses()" [disabled]="!budget">
          <mat-icon>check</mat-icon>
          Finish & View Summary
        </button>
        <button mat-raised-button color="warn" (click)="clearBudget()">
          <mat-icon>clear</mat-icon>
          Clear All Budget Data
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./budget-summary.component.css']
})
export class BudgetSummaryComponent implements OnInit, OnDestroy {
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
    this.router.navigate(['/budget-expenses']);
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
      this.router.navigate(['/budget']);
    }
  }

  finishExpenses(): void {
    this.snackBar.open('Redirecting to budget summary...', 'Close', { duration: 2000 });
    setTimeout(() => {
      this.router.navigate(['/budget-final']);
    }, 2000);
  }
}
