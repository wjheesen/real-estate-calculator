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
        </mat-card-content>
      </mat-card>

      <!-- Mortgage Affordability Card -->
      <mat-card class="mortgage-card" *ngIf="budget">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calculate</mat-icon>
            Mortgage Affordability
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="editMortgageSettings()">
              <mat-icon>tune</mat-icon>
              Adjust Mortgage Settings
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="mortgage-summary" *ngIf="hasMortgageSettings(); else noMortgageSettings">
            <div class="mortgage-params">
              <p><strong>Mortgage Parameters:</strong> {{ budget?.anticipatedMortgageRate }}% interest rate for {{ budget?.anticipatedMortgageTermYears }} years</p>
            </div>
            
            <div class="affordability-calculation">
              <div class="calc-row">
                <span class="label">Available for Housing:</span>
                <span class="value positive">{{ budget?.calculations?.availableForHousingMonthly | currency }}/month</span>
              </div>
              <div class="calc-row" *ngIf="hasHousingExpenses()">
                <span class="label">Housing Expenses:</span>
                <span class="value negative">-{{ budget?.calculations?.totalHousingExpensesMonthly | currency }}/month</span>
              </div>
              <mat-divider></mat-divider>
              <div class="calc-row highlight extra-large">
                <span class="label"><strong>Affordable Monthly Payment:</strong></span>
                <span class="value mortgage-payment"><strong>{{ budget?.calculations?.affordableMonthlyMortgagePayment | currency }}/month</strong></span>
              </div>
              <div class="calc-row highlight extra-large">
                <span class="label"><strong>Total Affordable Mortgage:</strong></span>
                <span class="value mortgage-amount"><strong>{{ budget?.calculations?.affordableTotalMortgageAmount | currency }}</strong></span>
              </div>
            </div>

            <div class="mortgage-guidance" *ngIf="budget?.calculations?.affordableMonthlyMortgagePayment">
              <mat-divider></mat-divider>
              <div class="guidance-content">
                <h4>Mortgage Guidance</h4>
                <div class="guidance-item" *ngIf="(budget?.calculations?.affordableMonthlyMortgagePayment || 0) > 0">
                  <mat-icon class="guidance-icon">info</mat-icon>
                  <div class="guidance-text">
                    <p><strong>You can afford a mortgage payment of {{ budget?.calculations?.affordableMonthlyMortgagePayment | currency }}/month</strong></p>
                    <p class="guidance-note">This calculation includes your housing expenses and leaves you with a sustainable budget.</p>
                  </div>
                </div>
                <div class="guidance-item warning" *ngIf="(budget?.calculations?.affordableMonthlyMortgagePayment || 0) <= 0">
                  <mat-icon class="guidance-icon">warning</mat-icon>
                  <div class="guidance-text">
                    <p><strong>Warning:</strong> Your housing expenses exceed your available housing budget.</p>
                    <p class="guidance-note">Consider reducing housing expenses or increasing income before taking on mortgage debt.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <ng-template #noMortgageSettings>
            <div class="no-mortgage-settings">
              <p>Set your anticipated mortgage rate and term to see affordability calculations.</p>
              <button mat-raised-button color="accent" (click)="editMortgageSettings()">
                <mat-icon>settings</mat-icon>
                Set Mortgage Parameters
              </button>
            </div>
          </ng-template>
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
        // No budget data, redirect to budget summary
        this.router.navigate(['/budget-summary']);
      }
    });
  }

  editIncome(): void {
    this.router.navigate(['/budget-income']);
  }

  editExpenses(): void {
    this.router.navigate(['/budget-expenses']);
  }

  editMortgageSettings(): void {
    this.router.navigate(['/budget-mortgage']);
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
      this.router.navigate(['/budget-summary']);
    }
  }

  hasHousingExpenses(): boolean {
    if (!this.budget) return false;
    const hasMonthly = this.budget.monthlyHousingExpenses && this.budget.monthlyHousingExpenses.length > 0;
    const hasAnnual = this.budget.annualHousingExpenses && this.budget.annualHousingExpenses.length > 0;
    return hasMonthly || hasAnnual;
  }

  hasMortgageSettings(): boolean {
    if (!this.budget) return false;
    return !!(this.budget.anticipatedMortgageRate && this.budget.anticipatedMortgageTermYears);
  }
}
