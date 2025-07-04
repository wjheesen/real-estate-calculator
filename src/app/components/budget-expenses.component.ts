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
import { Subscription } from 'rxjs';
import { BudgetService } from '../services/budget.service';
import { BudgetWithCalculations, Expense } from '../models/budget.interface';

@Component({
  selector: 'app-budget-expenses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="budget-expenses-container">
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

      <!-- Annual Expenses Card -->
      <mat-card class="expenses-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calendar_view_year</mat-icon>
            Annual Expenses (excluding housing)
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="annualExpenseForm" (ngSubmit)="addAnnualExpense()" class="expense-form">
            <div class="expense-input-row">
              <mat-form-field appearance="outline" class="expense-name">
                <mat-label>Expense Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g., Car Insurance">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="expense-amount">
                <mat-label>Annual Amount</mat-label>
                <input matInput type="number" formControlName="amount" placeholder="0">
                <span matPrefix>$</span>
              </mat-form-field>
              
              <button mat-raised-button color="primary" type="submit" [disabled]="!annualExpenseForm.valid">
                <mat-icon>add</mat-icon>
                Add
              </button>
            </div>
          </form>

          <div class="expense-list" *ngIf="hasAnnualExpenses()">
            <div class="expense-item" *ngFor="let expense of getAnnualExpenses()">
              <span class="expense-name">{{ expense.name }}</span>
              <span class="expense-amount">{{ expense.amount | currency }}</span>
              <button mat-icon-button color="warn" (click)="deleteAnnualExpense(expense.id!)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="expense-total">
              <strong>Total Annual Expenses: {{ budget?.calculations?.totalAnnualExpenses | currency }}</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Monthly Expenses Card -->
      <mat-card class="expenses-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>calendar_view_month</mat-icon>
            Monthly Expenses (excluding housing)
          </mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="monthlyExpenseForm" (ngSubmit)="addMonthlyExpense()" class="expense-form">
            <div class="expense-input-row">
              <mat-form-field appearance="outline" class="expense-name">
                <mat-label>Expense Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g., Groceries">
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="expense-amount">
                <mat-label>Monthly Amount</mat-label>
                <input matInput type="number" formControlName="amount" placeholder="0">
                <span matPrefix>$</span>
              </mat-form-field>
              
              <button mat-raised-button color="primary" type="submit" [disabled]="!monthlyExpenseForm.valid">
                <mat-icon>add</mat-icon>
                Add
              </button>
            </div>
          </form>

          <div class="expense-list" *ngIf="hasMonthlyExpenses()">
            <div class="expense-item" *ngFor="let expense of getMonthlyExpenses()">
              <span class="expense-name">{{ expense.name }}</span>
              <span class="expense-amount">{{ expense.amount | currency }}/month</span>
              <button mat-icon-button color="warn" (click)="deleteMonthlyExpense(expense.id!)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
            <div class="expense-total">
              <strong>Total Monthly Expenses: {{ budget?.calculations?.totalMonthlyExpenses | currency }}/month</strong>
              <br>
              <strong>Annualized: {{ budget?.calculations?.totalMonthlyExpensesAnnualized | currency }}</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Actions -->
      <div class="actions">
        <button mat-raised-button color="primary" (click)="backToSummary()" [disabled]="!budget">
          <mat-icon>arrow_back</mat-icon>
          Back to Summary
        </button>
        <button mat-raised-button color="warn" (click)="clearBudget()">
          <mat-icon>clear</mat-icon>
          Clear All Budget Data
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./budget-expenses.component.css']
})
export class BudgetExpensesComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private budgetService = inject(BudgetService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  budget: BudgetWithCalculations | null = null;
  annualExpenseForm!: FormGroup;
  monthlyExpenseForm!: FormGroup;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.initializeForms();
    this.loadBudget();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private initializeForms(): void {
    this.annualExpenseForm = this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });

    this.monthlyExpenseForm = this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });
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

  addAnnualExpense(): void {
    if (this.annualExpenseForm.valid) {
      const { name, amount } = this.annualExpenseForm.value;
      this.budgetService.addAnnualExpense(name, amount);
      this.annualExpenseForm.reset();
      this.snackBar.open('Annual expense added!', 'Close', { duration: 2000 });
    }
  }

  addMonthlyExpense(): void {
    if (this.monthlyExpenseForm.valid) {
      const { name, amount } = this.monthlyExpenseForm.value;
      this.budgetService.addMonthlyExpense(name, amount);
      this.monthlyExpenseForm.reset();
      this.snackBar.open('Monthly expense added!', 'Close', { duration: 2000 });
    }
  }

  deleteAnnualExpense(id: number): void {
    if (confirm('Are you sure you want to delete this annual expense?')) {
      this.budgetService.deleteAnnualExpense(id);
      this.snackBar.open('Annual expense deleted.', 'Close', { duration: 2000 });
    }
  }

  deleteMonthlyExpense(id: number): void {
    if (confirm('Are you sure you want to delete this monthly expense?')) {
      this.budgetService.deleteMonthlyExpense(id);
      this.snackBar.open('Monthly expense deleted.', 'Close', { duration: 2000 });
    }
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data? This cannot be undone.')) {
      this.budgetService.clearBudget();
      this.snackBar.open('Budget data cleared.', 'Close', { duration: 3000 });
      this.router.navigate(['/budget']);
    }
  }

  backToSummary(): void {
    this.router.navigate(['/budget-summary']);
  }

  // Helper methods for template
  hasAnnualExpenses(): boolean {
    return !!(this.budget?.annualExpenses && this.budget.annualExpenses.length > 0);
  }

  getAnnualExpenses(): Expense[] {
    return this.budget?.annualExpenses || [];
  }

  hasMonthlyExpenses(): boolean {
    return !!(this.budget?.monthlyExpenses && this.budget.monthlyExpenses.length > 0);
  }

  getMonthlyExpenses(): Expense[] {
    return this.budget?.monthlyExpenses || [];
  }
}
