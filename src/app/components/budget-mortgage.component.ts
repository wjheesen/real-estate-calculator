import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { BudgetService } from '../services/budget.service';
import { BudgetWithCalculations, Expense } from '../models/budget.interface';

@Component({
  selector: 'app-budget-mortgage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="budget-mortgage-container">
      <!-- Income Summary Card -->
      <mat-card class="income-summary-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>attach_money</mat-icon>
            Available for Housing
          </mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="editIncome()">
              <mat-icon>edit</mat-icon>
              Edit Income & Expenses
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content>
          <div class="income-summary" *ngIf="budget">
            <div class="summary-row">
              <span class="label">Net Income (Monthly):</span>
              <span class="value">{{ budget?.calculations?.netIncomeMonthly | currency }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Non-Housing Expenses (Monthly):</span>
              <span class="value">-{{ budget?.calculations?.totalMonthlyExpenses | currency }}</span>
            </div>
            <div class="summary-row highlight">
              <span class="label"><strong>Available for Housing (Monthly):</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.availableForHousingMonthly | currency }}</strong></span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Mortgage Parameters Card -->
      <mat-card class="mortgage-params-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>home</mat-icon>
            Mortgage Parameters
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="mortgageForm" class="mortgage-form">
            <div class="mortgage-input-row">
              <mat-form-field appearance="outline" class="mortgage-rate">
                <mat-label>Anticipated Interest Rate (%)</mat-label>
                <input matInput type="number" formControlName="rate" placeholder="6.5" step="0.01">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="mortgage-term">
                <mat-label>Term (Years)</mat-label>
                <input matInput type="number" formControlName="termYears" placeholder="30">
              </mat-form-field>
              
              <button mat-raised-button color="primary" (click)="updateMortgageParams()" [disabled]="!mortgageForm.valid">
                <mat-icon>calculate</mat-icon>
                Update
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Annual Housing Expenses Card -->
      <mat-card class="housing-expenses-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calendar_view_year</mat-icon>
            Annual Housing Expenses (Property Taxes, Insurance, etc.)
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="annualHousingExpenseForm" (ngSubmit)="addAnnualHousingExpense()" class="expense-form">
            <div class="expense-input-row">
              <mat-form-field appearance="outline" class="expense-name">
                <mat-label>Expense Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g., Property Taxes">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="expense-amount">
                <mat-label>Annual Amount</mat-label>
                <input matInput type="number" formControlName="amount" placeholder="0">
                <span matPrefix>$</span>
              </mat-form-field>
              
              <button mat-raised-button color="primary" type="submit" [disabled]="!annualHousingExpenseForm.valid">
                <mat-icon>add</mat-icon>
                Add
              </button>
            </div>
          </form>

          <div class="expense-list" *ngIf="hasAnnualHousingExpenses()">
            <div class="expense-item" *ngFor="let expense of getAnnualHousingExpenses()">
              <span class="expense-name">{{ expense.name }}</span>
              <span class="expense-amount">{{ expense.amount | currency }}</span>
              <button mat-icon-button color="warn" (click)="deleteAnnualHousingExpense(expense.id!)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="expense-total">
              <strong>Total Annual Housing Expenses: {{ budget?.calculations?.totalAnnualHousingExpenses | currency }}</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Monthly Housing Expenses Card -->
      <mat-card class="housing-expenses-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calendar_view_month</mat-icon>
            Monthly Housing Expenses (HOA, Utilities, etc.)
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="monthlyHousingExpenseForm" (ngSubmit)="addMonthlyHousingExpense()" class="expense-form">
            <div class="expense-input-row">
              <mat-form-field appearance="outline" class="expense-name">
                <mat-label>Expense Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g., HOA Fees">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="expense-amount">
                <mat-label>Monthly Amount</mat-label>
                <input matInput type="number" formControlName="amount" placeholder="0">
                <span matPrefix>$</span>
              </mat-form-field>
              
              <button mat-raised-button color="primary" type="submit" [disabled]="!monthlyHousingExpenseForm.valid">
                <mat-icon>add</mat-icon>
                Add
              </button>
            </div>
          </form>

          <div class="expense-list" *ngIf="hasMonthlyHousingExpenses()">
            <div class="expense-item" *ngFor="let expense of getMonthlyHousingExpenses()">
              <span class="expense-name">{{ expense.name }}</span>
              <span class="expense-amount">{{ expense.amount | currency }}/month</span>
              <button mat-icon-button color="warn" (click)="deleteMonthlyHousingExpense(expense.id!)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="expense-total">
              <strong>Total Monthly Housing Expenses: {{ budget?.calculations?.totalMonthlyHousingExpenses | currency }}/month</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Mortgage Affordability Results Card -->
      <mat-card class="mortgage-results-card" *ngIf="budget?.calculations?.affordableMonthlyMortgagePayment">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calculate</mat-icon>
            Mortgage Affordability
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="mortgage-results">
            <div class="result-row">
              <span class="label">Available for Housing:</span>
              <span class="value">{{ budget?.calculations?.availableForHousingMonthly | currency }}/month</span>
            </div>
            <div class="result-row">
              <span class="label">Monthly Housing Expenses:</span>
              <span class="value">-{{ budget?.calculations?.totalMonthlyHousingExpenses | currency }}/month</span>
            </div>
            <div class="result-row">
              <span class="label">Annual Housing Expenses (Monthly):</span>
              <span class="value">-{{ (budget?.calculations?.totalAnnualHousingExpenses || 0) / 12 | currency }}/month</span>
            </div>
            <div class="result-row">
              <span class="label"><strong>Total Housing Expenses:</strong></span>
              <span class="value"><strong>-{{ budget?.calculations?.totalHousingExpensesMonthly | currency }}/month</strong></span>
            </div>
            <mat-divider></mat-divider>
            <div class="result-row highlight large">
              <span class="label"><strong>Affordable Monthly Mortgage Payment:</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.affordableMonthlyMortgagePayment | currency }}/month</strong></span>
            </div>
            <div class="result-row highlight large">
              <span class="label"><strong>Total Affordable Mortgage Amount:</strong></span>
              <span class="value"><strong>{{ budget?.calculations?.affordableTotalMortgageAmount | currency }}</strong></span>
            </div>
            
            <div class="mortgage-details" *ngIf="budget?.anticipatedMortgageRate && budget?.anticipatedMortgageTermYears">
              <p class="details-text">
                <strong>Calculation based on:</strong> {{ budget?.anticipatedMortgageRate }}% interest rate for {{ budget?.anticipatedMortgageTermYears }} years
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Actions -->
      <div class="actions">
        <button mat-raised-button (click)="backToSummary()" [disabled]="!budget">
          <mat-icon>arrow_back</mat-icon>
          Back to Housing Summary
        </button>
        <button mat-raised-button color="primary" (click)="viewFinalSummary()" [disabled]="!budget">
          <mat-icon>arrow_forward</mat-icon>
          Continue to Final Summary
        </button>
        <button mat-raised-button color="warn" (click)="clearBudget()">
          <mat-icon>clear</mat-icon>
          Clear All Budget Data
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./budget-mortgage.component.css']
})
export class BudgetMortgageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private budgetService = inject(BudgetService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  budget: BudgetWithCalculations | null = null;
  mortgageForm!: FormGroup;
  annualHousingExpenseForm!: FormGroup;
  monthlyHousingExpenseForm!: FormGroup;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.initializeForms();
    this.loadBudget();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private initializeForms(): void {
    this.mortgageForm = this.fb.group({
      rate: [6.5, [Validators.required, Validators.min(0), Validators.max(30)]],
      termYears: [30, [Validators.required, Validators.min(1), Validators.max(50)]]
    });

    this.annualHousingExpenseForm = this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });

    this.monthlyHousingExpenseForm = this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadBudget(): void {
    this.subscription = this.budgetService.getBudget().subscribe(budget => {
      if (budget) {
        this.budget = budget;
        // Update form with existing mortgage parameters
        if (budget.anticipatedMortgageRate !== undefined) {
          this.mortgageForm.patchValue({
            rate: budget.anticipatedMortgageRate
          });
        }
        if (budget.anticipatedMortgageTermYears !== undefined) {
          this.mortgageForm.patchValue({
            termYears: budget.anticipatedMortgageTermYears
          });
        }
      } else {
        // No budget data, redirect to budget summary
        this.router.navigate(['/budget-summary']);
      }
    });
  }

  editIncome(): void {
    this.router.navigate(['/budget-income']);
  }

  updateMortgageParams(): void {
    if (this.mortgageForm.valid) {
      const { rate, termYears } = this.mortgageForm.value;
      this.budgetService.updateMortgageParameters(rate, termYears);
      this.snackBar.open('Mortgage parameters updated!', 'Close', { duration: 2000 });
    }
  }

  addAnnualHousingExpense(): void {
    if (this.annualHousingExpenseForm.valid) {
      const { name, amount } = this.annualHousingExpenseForm.value;
      this.budgetService.addAnnualHousingExpense(name, amount);
      this.annualHousingExpenseForm.reset();
      this.snackBar.open('Annual housing expense added!', 'Close', { duration: 2000 });
    }
  }

  addMonthlyHousingExpense(): void {
    if (this.monthlyHousingExpenseForm.valid) {
      const { name, amount } = this.monthlyHousingExpenseForm.value;
      this.budgetService.addMonthlyHousingExpense(name, amount);
      this.monthlyHousingExpenseForm.reset();
      this.snackBar.open('Monthly housing expense added!', 'Close', { duration: 2000 });
    }
  }

  deleteAnnualHousingExpense(id: number): void {
    if (confirm('Are you sure you want to delete this annual housing expense?')) {
      this.budgetService.deleteAnnualHousingExpense(id);
      this.snackBar.open('Annual housing expense deleted.', 'Close', { duration: 2000 });
    }
  }

  deleteMonthlyHousingExpense(id: number): void {
    if (confirm('Are you sure you want to delete this monthly housing expense?')) {
      this.budgetService.deleteMonthlyHousingExpense(id);
      this.snackBar.open('Monthly housing expense deleted.', 'Close', { duration: 2000 });
    }
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
      this.router.navigate(['/budget-summary']);
    }
  }

  backToSummary(): void {
    this.router.navigate(['/budget-summary']);
  }

  viewFinalSummary(): void {
    this.router.navigate(['/budget-final']);
  }

  // Helper methods for template
  hasAnnualHousingExpenses(): boolean {
    return !!(this.budget?.annualHousingExpenses && this.budget.annualHousingExpenses.length > 0);
  }

  getAnnualHousingExpenses(): Expense[] {
    return this.budget?.annualHousingExpenses || [];
  }

  hasMonthlyHousingExpenses(): boolean {
    return !!(this.budget?.monthlyHousingExpenses && this.budget.monthlyHousingExpenses.length > 0);
  }

  getMonthlyHousingExpenses(): Expense[] {
    return this.budget?.monthlyHousingExpenses || [];
  }
}
