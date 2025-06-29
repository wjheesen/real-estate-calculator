import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { RealEstateCalculatorService } from '../services/real-estate-calculator.service';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from '../services/calculator-data.service';
import { SettingsService } from '../services/settings.service';
import { RealEstateCalculation, CalculationResults, SavedCalculation } from '../models/real-estate.interface';
import { Settings } from '../models/settings.interface';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule
  ],
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.css']
})
export class CalculatorComponent implements OnInit, OnDestroy {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  
  calculatorForm: FormGroup;
  results: CalculationResults | null = null;
  currentSettings: Settings | null = null;
  currentCalculationId: number | null = null; // Track currently loaded calculation
  calculationName: string = ''; // For the save input field
  private loadedCalculationSubscription?: Subscription;
  private settingsSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private calculatorService: RealEstateCalculatorService,
    private dbService: IndexedDbService,
    private calculatorDataService: CalculatorDataService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {
    this.calculatorForm = this.createForm();
  }

  ngOnInit(): void {
    // Load settings and set defaults
    this.currentSettings = this.settingsService.getCurrentSettings();
    this.setFormDefaults();

    // Subscribe to settings changes
    this.settingsSubscription = this.settingsService.getSettings().subscribe(settings => {
      this.currentSettings = settings;
      // Only update form if no calculation has been loaded
      if (!this.loadedCalculationSubscription) {
        this.setFormDefaults();
      }
    });

    // Watch for down payment changes to enable/disable mortgage insurance
    this.calculatorForm.get('downPayment')?.valueChanges.subscribe(() => {
      this.updateMortgageInsuranceState();
    });
    this.calculatorForm.get('usePercentageForDownPayment')?.valueChanges.subscribe(() => {
      this.updateMortgageInsuranceState();
    });
    this.calculatorForm.get('purchasePrice')?.valueChanges.subscribe(() => {
      this.updateMortgageInsuranceState();
    });

    this.loadedCalculationSubscription = this.calculatorDataService.loadedCalculation$.subscribe(
      calculation => {
        if (calculation) {
          this.loadCalculationIntoForm(calculation);
          this.calculatorDataService.clearLoadedCalculation();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.loadedCalculationSubscription) {
      this.loadedCalculationSubscription.unsubscribe();
    }
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      purchasePrice: [null, [Validators.required, Validators.min(0)]],
      rehabCosts: [null, [Validators.required, Validators.min(0)]],
      closingCosts: [null, [Validators.required, Validators.min(0)]],
      downPayment: [null, [Validators.required, Validators.min(0)]],
      usePercentageForDownPayment: [false],
      interestRate: [4.5, [Validators.required, Validators.min(0)]],
      termYears: [30, [Validators.required, Validators.min(1)]],
      paymentsPerYear: [12, [Validators.required, Validators.min(1)]],
      insuranceCost: [null, [Validators.required, Validators.min(0)]],
      mortgageInsurance: [600, [Validators.required, Validators.min(0)]],
      usePercentageForMortgageInsurance: [false],
      propertyTaxes: [null, [Validators.required, Validators.min(0)]],
      expectedRentalIncome: [null, [Validators.required, Validators.min(0)]],
      operatingExpenses: [300, [Validators.required, Validators.min(0)]],
      usePercentageForOpex: [false],
      capitalExpenditures: [100, [Validators.required, Validators.min(0)]],
      usePercentageForCapex: [false],
      appreciationRate: [3, [Validators.required, Validators.min(0)]],
      // Tax-related fields
      scheduleEDeductibleAmount: [null, [Validators.required, Validators.min(0)]],
      rentalUsePercentage: [100, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  private setFormDefaults(): void {
    if (this.currentSettings) {
      this.calculatorForm.patchValue({
        interestRate: this.currentSettings.interestRate,
        termYears: this.currentSettings.termInYears,
        paymentsPerYear: this.currentSettings.paymentsPerYear,
        appreciationRate: this.currentSettings.appreciationPercentage
      });

      // Set down payment percentage if using percentage mode
      if (this.calculatorForm.get('usePercentageForDownPayment')?.value) {
        this.calculatorForm.patchValue({
          downPayment: this.currentSettings.downPaymentPercentage
        });
      }

      // Set operating expenses percentage if using percentage mode
      if (this.calculatorForm.get('usePercentageForOpex')?.value) {
        this.calculatorForm.patchValue({
          operatingExpenses: this.currentSettings.operatingExpensesPercentage
        });
      }

      // Set capital expenditures percentage if using percentage mode
      if (this.calculatorForm.get('usePercentageForCapex')?.value) {
        this.calculatorForm.patchValue({
          capitalExpenditures: this.currentSettings.capitalExpendituresPercentage
        });
      }

      // Set mortgage insurance percentage if using percentage mode
      if (this.calculatorForm.get('usePercentageForMortgageInsurance')?.value) {
        this.calculatorForm.patchValue({
          mortgageInsurance: this.currentSettings.mortgageInsuranceRatePercentage
        });
      }
    }
  }

  get isDownPaymentLessThan20Percent(): boolean {
    const usePercentage = this.calculatorForm.get('usePercentageForDownPayment')?.value;
    const downPayment = this.calculatorForm.get('downPayment')?.value || 0;
    const purchasePrice = this.calculatorForm.get('purchasePrice')?.value || 1;
    
    if (usePercentage) {
      return downPayment < 20;
    } else {
      const downPaymentPercentage = (downPayment / purchasePrice) * 100;
      return downPaymentPercentage < 20;
    }
  }

  private loadCalculationIntoForm(calculation: SavedCalculation): void {
    // Track the current calculation ID for potential overwrite
    this.currentCalculationId = calculation.id || null;
    
    // Set the calculation name for the save input
    this.calculationName = calculation.name || '';
    
    this.calculatorForm.patchValue({
      purchasePrice: calculation.purchasePrice,
      rehabCosts: calculation.rehabCosts,
      closingCosts: calculation.closingCosts,
      downPayment: calculation.downPayment,
      usePercentageForDownPayment: calculation.usePercentageForDownPayment,
      interestRate: calculation.interestRate,
      termYears: calculation.termYears,
      paymentsPerYear: calculation.paymentsPerYear,
      insuranceCost: calculation.insuranceCost,
      mortgageInsurance: calculation.mortgageInsurance,
      usePercentageForMortgageInsurance: calculation.usePercentageForMortgageInsurance,
      propertyTaxes: calculation.propertyTaxes,
      expectedRentalIncome: calculation.expectedRentalIncome,
      operatingExpenses: calculation.operatingExpenses,
      usePercentageForOpex: calculation.usePercentageForOpex,
      capitalExpenditures: calculation.capitalExpenditures,
      usePercentageForCapex: calculation.usePercentageForCapex,
      appreciationRate: calculation.appreciationRate,
      scheduleEDeductibleAmount: calculation.scheduleEDeductibleAmount || 0,
      rentalUsePercentage: calculation.rentalUsePercentage || 100
    });

    if (calculation.results) {
      this.results = calculation.results;
    } else {
      this.onCalculate();
    }
  }

  private updateMortgageInsuranceState(): void {
    const mortgageInsuranceControl = this.calculatorForm.get('mortgageInsurance');
    const mortgageInsuranceCheckboxControl = this.calculatorForm.get('usePercentageForMortgageInsurance');
    
    if (!this.isDownPaymentLessThan20Percent) {
      // Disable and clear mortgage insurance if down payment >= 20%
      mortgageInsuranceControl?.disable();
      mortgageInsuranceCheckboxControl?.disable();
      mortgageInsuranceControl?.setValue(0);
      mortgageInsuranceCheckboxControl?.setValue(false);
    } else {
      // Enable mortgage insurance if down payment < 20%
      mortgageInsuranceControl?.enable();
      mortgageInsuranceCheckboxControl?.enable();
      
      // Set default value from settings if currently 0
      if (mortgageInsuranceControl?.value === 0 && this.currentSettings) {
        if (mortgageInsuranceCheckboxControl?.value) {
          mortgageInsuranceControl?.setValue(this.currentSettings.mortgageInsuranceRatePercentage);
        } else {
          // You might want to calculate a dollar amount based on loan amount
          // For now, just set a reasonable default
          mortgageInsuranceControl?.setValue(600);
        }
      }
    }
  }

  onCalculate(): void {
    if (this.calculatorForm.valid) {
      const calculation: RealEstateCalculation = this.calculatorForm.value;
      this.results = this.calculatorService.calculateResults(calculation);
      
      // Switch to results tab after calculation
      setTimeout(() => {
        this.tabGroup.selectedIndex = 1;
      });
      
      // Set default calculation name if not already set
      if (!this.calculationName.trim()) {
        this.calculationName = 'New Property';
      }
    }
  }

  onSave(): void {
    if (this.results && this.calculatorForm.valid && this.calculationName.trim()) {
      if (this.currentCalculationId) {
        // Overwrite existing calculation
        const savedCalculation: SavedCalculation = {
          ...this.calculatorForm.value,
          id: this.currentCalculationId,
          name: this.calculationName.trim(),
          results: this.results,
          updatedAt: new Date()
        };

        this.dbService.saveCalculation(savedCalculation).subscribe({
          next: (saved) => {
            this.snackBar.open('Calculation updated successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error updating calculation:', error);
            this.snackBar.open('Error updating calculation', 'Close', {
              duration: 3000
            });
          }
        });
      } else {
        // Create new calculation
        const savedCalculation: SavedCalculation = {
          ...this.calculatorForm.value,
          name: this.calculationName.trim(),
          results: this.results,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.dbService.saveCalculation(savedCalculation).subscribe({
          next: (saved) => {
            this.currentCalculationId = saved.id || null; // Track the new ID
            this.snackBar.open('Calculation saved successfully!', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error saving calculation:', error);
            this.snackBar.open('Error saving calculation', 'Close', {
              duration: 3000
            });
          }
        });
      }
    }
  }

  onNewCalculation(): void {
    this.currentCalculationId = null;
    this.results = null;
    this.calculationName = '';
    this.calculatorForm.reset();
    this.setFormDefaults();
    
    // Switch back to calculator tab
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0;
    }
    
    this.snackBar.open('New calculation started', 'Close', {
      duration: 2000
    });
  }
}
