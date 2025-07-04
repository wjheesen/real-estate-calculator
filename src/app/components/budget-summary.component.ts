import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="budget-summary-container">
      <h1 class="page-title">
        <mat-icon>summarize</mat-icon>
        Budget Summary
      </h1>
      <p class="page-description">Review your budget information and proceed to mortgage planning</p>

      <!-- Income Summary Card -->
      <mat-card class="income-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>attach_money</mat-icon>
            Income Summary
          </mat-card-title>
          <div class="header-actions">
            <button mat-stroked-button (click)="editIncome()">
              <mat-icon>edit</mat-icon>
              Edit Income
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="income-summary" *ngIf="budget?.calculations; else noIncomeData">
            <div class="summary-row">
              <span class="label">Monthly Net Income:</span>
              <span class="value">{{ budget?.calculations?.netIncomeMonthly | currency }}/month</span>
            </div>
            <div class="summary-row">
              <span class="label">Monthly Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyExpenses | currency }}/month</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Available for Housing:</strong></span>
              <span class="value positive"><strong>{{ budget?.calculations?.availableForHousingMonthly | currency }}/month</strong></span>
            </div>
          </div>
          
          <ng-template #noIncomeData>
            <div class="no-data">
              <mat-icon>info</mat-icon>
              <p>Start by adding your income and expense information</p>
              <button mat-raised-button color="primary" (click)="editIncome()">
                <mat-icon>add</mat-icon>
                Add Income & Expenses
              </button>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Expenses Summary Card -->
      <mat-card class="expenses-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>receipt</mat-icon>
            Non-Housing Expenses
          </mat-card-title>
          <div class="header-actions">
            <button mat-stroked-button (click)="editExpenses()" [disabled]="!budget">
              <mat-icon>edit</mat-icon>
              Edit Expenses
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="expenses-summary" *ngIf="budget?.calculations; else noExpensesData">
            <div class="summary-row">
              <span class="label">Total Monthly Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyExpenses | currency }}/month</span>
            </div>
            <p class="help-text">These are your regular monthly expenses excluding housing costs.</p>
          </div>
          
          <ng-template #noExpensesData>
            <div class="no-data">
              <mat-icon>info</mat-icon>
              <p>Add your monthly expenses to get accurate housing budget calculations</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Housing Expenses Card -->
      <mat-card class="housing-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>home_work</mat-icon>
            Housing Expenses
          </mat-card-title>
          <div class="header-actions">
            <button mat-stroked-button (click)="editHousingExpenses()">
              <mat-icon>edit</mat-icon>
              Edit Housing Costs
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="housing-summary" *ngIf="hasHousingExpenses(); else noHousingData">
            <div class="summary-row">
              <span class="label">Monthly Housing Expenses:</span>
              <span class="value">{{ budget?.calculations?.totalMonthlyHousingExpenses | currency }}/month</span>
            </div>
            <div class="summary-row">
              <span class="label">Annual Housing Expenses (Monthly):</span>
              <span class="value">{{ (budget?.calculations?.totalAnnualHousingExpenses || 0) / 12 | currency }}/month</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Total Housing Expenses:</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.totalHousingExpensesMonthly | currency }}/month</strong></span>
            </div>
          </div>
          
          <ng-template #noHousingData>
            <div class="no-data">
              <mat-icon>info</mat-icon>
              <p>Add housing expenses like property taxes, insurance, HOA fees, etc.</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <!-- Action Buttons -->
      <div class="actions">
        <button mat-raised-button color="primary" (click)="viewMortgagePlanning()" [disabled]="!budget?.calculations">
          <mat-icon>home</mat-icon>
          Mortgage Planning & Affordability
        </button>
        <button mat-stroked-button color="warn" (click)="clearBudget()" *ngIf="budget">
          <mat-icon>clear</mat-icon>
          Clear All Data
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
      this.budget = budget; // Always set budget, even if null
    });
  }

  editIncome(): void {
    this.router.navigate(['/budget-income']);
  }

  editExpenses(): void {
    this.router.navigate(['/budget-expenses']);
  }

  editHousingExpenses(): void {
    this.router.navigate(['/budget-mortgage']);
  }

  viewMortgagePlanning(): void {
    this.router.navigate(['/budget-final']);
  }

  hasHousingExpenses(): boolean {
    if (!this.budget) return false;
    const hasMonthly = this.budget.monthlyHousingExpenses && this.budget.monthlyHousingExpenses.length > 0;
    const hasAnnual = this.budget.annualHousingExpenses && this.budget.annualHousingExpenses.length > 0;
    return hasMonthly || hasAnnual;
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
    }
  }
}
