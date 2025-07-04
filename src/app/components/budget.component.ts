import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { BudgetService } from '../services/budget.service';
import { BudgetData, BudgetWithCalculations, PayDeduction } from '../models/budget.interface';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule,
    MatDialogModule
  ],
  template: `
    <div class="budget-container">
      <mat-card class="budget-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>account_balance_wallet</mat-icon>
            Budget Calculator
          </mat-card-title>
          <mat-card-subtitle>
            Track your income and deductions to calculate net income
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="budgetForm" class="budget-form">
            
            <!-- Pay Period Selection -->
            <div class="form-section">
              <mat-checkbox formControlName="useTwoWeekPayStub" class="pay-period-checkbox">
                Use 2 week pay stub (multiply by 26 for annual amounts)
              </mat-checkbox>
              <p class="pay-period-hint">
                {{ budgetForm.get('useTwoWeekPayStub')?.value 
                   ? 'Enter amounts from your bi-weekly pay stub. They will be multiplied by 26 to get annual amounts.' 
                   : 'Enter annual amounts directly.' }}
              </p>
            </div>

            <!-- Gross Income -->
            <div class="form-section">
              <h3>Income</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ budgetForm.get('useTwoWeekPayStub')?.value ? 'Bi-weekly Gross Income' : 'Annual Gross Income' }}</mat-label>
                <input matInput type="number" formControlName="grossIncome" step="0.01">
                <span matPrefix>$</span>
              </mat-form-field>
            </div>

            <!-- Pay Deductions -->
            <div class="form-section">
              <h3>Pay Deductions</h3>
              
              <!-- Add Deduction Form -->
              <form [formGroup]="deductionForm" (ngSubmit)="addDeduction()" class="deduction-input-form">
                <div class="deduction-input-row">
                  <mat-form-field appearance="outline" class="deduction-name">
                    <mat-label>Deduction Name</mat-label>
                    <input matInput formControlName="name" placeholder="e.g., Federal Tax, Health Insurance">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="deduction-amount">
                    <mat-label>{{ budgetForm.get('useTwoWeekPayStub')?.value ? 'Bi-weekly Amount' : 'Annual Amount' }}</mat-label>
                    <input matInput type="number" formControlName="amount" placeholder="0">
                    <span matPrefix>$</span>
                  </mat-form-field>
                  
                  <button mat-raised-button color="primary" type="submit" [disabled]="!deductionForm.valid">
                    <mat-icon>add</mat-icon>
                    Add
                  </button>
                </div>
              </form>

              <div class="deduction-list" *ngIf="payDeductions.length > 0">
                <div class="deduction-item" *ngFor="let deduction of payDeductions.controls; let i = index" [formGroup]="$any(deduction)">
                  <span class="deduction-name">{{ deduction.get('name')?.value }}</span>
                  <span class="deduction-amount">{{ deduction.get('amount')?.value | currency }}{{ budgetForm.get('useTwoWeekPayStub')?.value ? ' bi-weekly' : ' annually' }}</span>
                  <button mat-icon-button color="warn" (click)="removeDeduction(i)" type="button">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <div class="no-deductions" *ngIf="payDeductions.length === 0">
                <p>No deductions added yet. Add deductions like taxes, insurance, or retirement contributions.</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="form-actions">
              <button mat-raised-button color="primary" (click)="calculateBudget()" [disabled]="!budgetForm.valid">
                <mat-icon>calculate</mat-icon>
                Calculate Budget
              </button>
              
              <button mat-stroked-button (click)="clearBudget()" type="button">
                <mat-icon>clear</mat-icon>
                Clear All
              </button>
            </div>
          </form>

          <!-- Results Section -->
          <div class="results-section" *ngIf="budgetResults">
            <mat-card class="results-card">
              <mat-card-header>
                <mat-card-title>Budget Summary</mat-card-title>
              </mat-card-header>
              
              <mat-card-content>
                <div class="results-grid">
                  <!-- Annual Figures -->
                  <div class="result-group">
                    <h4>Annual Figures</h4>
                    <div class="result-item">
                      <span class="label">Gross Income:</span>
                      <span class="value positive">{{ budgetResults.calculations.grossIncomeAnnual | currency }}</span>
                    </div>
                    <div class="result-item">
                      <span class="label">Total Deductions:</span>
                      <span class="value negative">{{ budgetResults.calculations.totalDeductionsAnnual | currency }}</span>
                    </div>
                    <div class="result-item total">
                      <span class="label">Net Income:</span>
                      <span class="value" [class.positive]="budgetResults.calculations.netIncomeAnnual > 0" 
                            [class.negative]="budgetResults.calculations.netIncomeAnnual <= 0">
                        {{ budgetResults.calculations.netIncomeAnnual | currency }}
                      </span>
                    </div>
                  </div>

                  <!-- Monthly Figures -->
                  <div class="result-group">
                    <h4>Monthly Figures</h4>
                    <div class="result-item">
                      <span class="label">Gross Income:</span>
                      <span class="value positive">{{ budgetResults.calculations.grossIncomeMonthly | currency }}</span>
                    </div>
                    <div class="result-item">
                      <span class="label">Total Deductions:</span>
                      <span class="value negative">{{ budgetResults.calculations.totalDeductionsMonthly | currency }}</span>
                    </div>
                    <div class="result-item total">
                      <span class="label">Net Income:</span>
                      <span class="value" [class.positive]="budgetResults.calculations.netIncomeMonthly > 0" 
                            [class.negative]="budgetResults.calculations.netIncomeMonthly <= 0">
                        {{ budgetResults.calculations.netIncomeMonthly | currency }}
                      </span>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private budgetService = inject(BudgetService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  budgetForm!: FormGroup;
  deductionForm!: FormGroup;
  budgetResults: BudgetWithCalculations | null = null;
  private subscription?: Subscription;

  ngOnInit(): void {
    this.initializeForm();
    this.loadExistingBudget();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private initializeForm(): void {
    this.budgetForm = this.fb.group({
      grossIncome: [0, [Validators.required, Validators.min(0)]],
      useTwoWeekPayStub: [false],
      payDeductions: this.fb.array([])
    });

    this.deductionForm = this.fb.group({
      name: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    });

    // Watch for changes in the two-week checkbox to update labels
    this.budgetForm.get('useTwoWeekPayStub')?.valueChanges.subscribe(() => {
      // Form will automatically update due to template bindings
    });
  }

  private loadExistingBudget(): void {
    this.subscription = this.budgetService.getBudget().subscribe(budget => {
      if (budget) {
        this.budgetResults = budget;
        this.populateForm(budget);
      }
    });
  }

  private populateForm(budget: BudgetWithCalculations): void {
    this.budgetForm.patchValue({
      grossIncome: budget.grossIncome,
      useTwoWeekPayStub: budget.useTwoWeekPayStub
    });

    // Clear existing deductions and add from budget
    const deductionsArray = this.payDeductions;
    deductionsArray.clear();
    
    budget.payDeductions.forEach(deduction => {
      deductionsArray.push(this.createDeductionFormGroup(deduction));
    });
  }

  get payDeductions(): FormArray {
    return this.budgetForm.get('payDeductions') as FormArray;
  }

  private createDeductionFormGroup(deduction?: PayDeduction): FormGroup {
    return this.fb.group({
      id: [deduction?.id || Date.now()],
      name: [deduction?.name || '', Validators.required],
      amount: [deduction?.amount || 0, [Validators.required, Validators.min(0)]],
      description: [deduction?.description || '']
    });
  }

  addDeduction(): void {
    if (this.deductionForm.valid) {
      const { name, amount } = this.deductionForm.value;
      const newDeduction: PayDeduction = {
        id: Date.now(),
        name,
        amount
      };
      
      this.payDeductions.push(this.createDeductionFormGroup(newDeduction));
      this.deductionForm.reset();
      this.snackBar.open('Deduction added!', 'Close', { duration: 2000 });
    }
  }

  removeDeduction(index: number): void {
    this.payDeductions.removeAt(index);
  }

  calculateBudget(): void {
    if (this.budgetForm.valid) {
      const formValue = this.budgetForm.value;
      const budgetData: BudgetData = {
        grossIncome: formValue.grossIncome,
        useTwoWeekPayStub: formValue.useTwoWeekPayStub,
        payDeductions: formValue.payDeductions,
        annualExpenses: [],
        monthlyExpenses: []
      };

      this.budgetService.saveBudget(budgetData);
      this.snackBar.open('Budget saved! Redirecting to budget summary...', 'Close', {
        duration: 2000
      });
      
      // Redirect to budget summary page
      setTimeout(() => {
        this.router.navigate(['/budget-summary']);
      }, 2000);
    } else {
      this.snackBar.open('Please fill in all required fields correctly.', 'Close', {
        duration: 3000
      });
    }
  }

  clearBudget(): void {
    if (confirm('Are you sure you want to clear all budget data?')) {
      this.budgetService.clearBudget();
      this.budgetResults = null;
      this.initializeForm();
      this.snackBar.open('Budget data cleared.', 'Close', {
        duration: 3000
      });
    }
  }
}
