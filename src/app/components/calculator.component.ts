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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { RealEstateCalculatorService } from '../services/real-estate-calculator.service';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from './calculator-data.service';
import { SettingsService } from '../services/settings.service';
import { PortfolioService } from '../services/portfolio.service';
import { RealEstateCalculation, CalculationResults, SavedCalculation, Portfolio } from '../models/real-estate.interface';
import { Settings } from '../models/settings.interface';
import { SettingsComponent } from './settings.component';

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
    MatSelectModule,
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
  selectedPortfolioId: number = 1; // Default to "My Portfolio"
  portfolios: Portfolio[] = [];
  newPortfolioName: string = '';
  originalCalculation: SavedCalculation | null = null; // Store original calculation for cancel functionality
  private isDuplicating: boolean = false; // Track if we're currently duplicating
  private loadedCalculationSubscription?: Subscription;
  private settingsSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private calculatorService: RealEstateCalculatorService,
    private dbService: IndexedDbService,
    private calculatorDataService: CalculatorDataService,
    private settingsService: SettingsService,
    private portfolioService: PortfolioService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.calculatorForm = this.createForm();
  }

  ngOnInit(): void {
    // Load portfolios
    this.loadPortfolios();
    
    // Load settings first
    this.currentSettings = this.settingsService.getCurrentSettings();
    
    // Check for calculation ID or duplicate in URL parameters
    this.route.queryParams.subscribe(params => {
      console.log('Query params received:', params);
      const calculationId = params['id'];
      const duplicateId = params['duplicate'];
      const suggestedName = params['name'];
      
      if (calculationId) {
        console.log('Loading calculation from URL:', calculationId);
        this.loadCalculationFromUrl(+calculationId);
      } else if (duplicateId) {
        console.log('Loading calculation for duplication:', duplicateId, suggestedName);
        this.loadCalculationForDuplication(+duplicateId, suggestedName);
      } else {
        console.log('No URL params, setting form defaults');
        // Only set form defaults if we're not loading a calculation
        this.setFormDefaults();
      }
    });

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

  private loadPortfolios(): void {
    this.portfolioService.getAllPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios = portfolios;
        // Ensure default portfolio exists
        if (portfolios.length === 0) {
          this.portfolioService.createNewPortfolio('My Portfolio', 'Default portfolio').subscribe({
            next: (defaultPortfolio) => {
              this.portfolios = [defaultPortfolio];
              this.selectedPortfolioId = defaultPortfolio.id || 1;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading portfolios:', error);
      }
    });
  }

  private loadCalculationFromUrl(calculationId: number): void {
    this.dbService.getCalculation(calculationId).subscribe({
      next: (calculation) => {
        if (calculation) {
          this.loadCalculationIntoForm(calculation);
          this.snackBar.open(`Loaded "${calculation.name}" from URL`, 'Close', {
            duration: 3000
          });
        } else {
          this.snackBar.open('Calculation not found', 'Close', {
            duration: 3000
          });
          // Remove invalid ID from URL
          this.router.navigate(['/calculator']);
        }
      },
      error: (error) => {
        console.error('Error loading calculation from URL:', error);
        this.snackBar.open('Error loading calculation', 'Close', {
          duration: 3000
        });
        // Remove invalid ID from URL
        this.router.navigate(['/calculator']);
      }
    });
  }

  private loadCalculationForDuplication(calculationId: number, suggestedName?: string): void {
    this.dbService.getCalculation(calculationId).subscribe({
      next: (calculation) => {
        if (calculation) {
          // Set duplication flag to prevent form defaults from overriding
          this.isDuplicating = true;
          
          // Simply populate the form with the calculation data
          this.populateFormFromCalculation(calculation);
          
          // Pre-fill the calculation name with the suggested name
          if (suggestedName) {
            this.calculationName = suggestedName;
          }
          
          // This is NOT a loaded calculation - it's a new calculation with pre-filled data
          this.currentCalculationId = null;
          
          // Clear URL parameters
          this.router.navigate(['/calculator'], { replaceUrl: true });
          
          this.snackBar.open(`Loaded "${calculation.name}" for duplication. Make your changes and save with a new name.`, 'Close', {
            duration: 4000
          });
        } else {
          this.snackBar.open('Calculation not found', 'Close', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error loading calculation for duplication:', error);
        this.snackBar.open('Error loading calculation', 'Close', {
          duration: 3000
        });
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      purchasePrice: [null, [Validators.required, Validators.min(0)]],
      rehabCosts: [0, [Validators.min(0)]],
      closingCosts: [0, [Validators.min(0)]],
      downPayment: [null, [Validators.min(0)]],
      usePercentageForDownPayment: [false],
      interestRate: [4.5, [Validators.required, Validators.min(0)]],
      termYears: [30, [Validators.required, Validators.min(1)]],
      paymentsPerYear: [12, [Validators.required, Validators.min(1)]],
      insuranceCost: [0, [Validators.min(0)]],
      mortgageInsurance: [0, [Validators.min(0)]],
      usePercentageForMortgageInsurance: [false],
      propertyTaxes: [0, [Validators.min(0)]],
      expectedRentalIncome: [0, [Validators.min(0)]],
      operatingExpenses: [0, [Validators.min(0)]],
      usePercentageForOpex: [false],
      capitalExpenditures: [0, [Validators.min(0)]],
      usePercentageForCapex: [false],
      appreciationRate: [0, [Validators.min(0)]],
      // Tax-related fields
      scheduleEDeductibleAmount: [0, [Validators.min(0)]],
      rentalUsePercentage: [100, [Validators.min(0), Validators.max(100)]]
    });
  }

  private setFormDefaults(): void {
    if (this.currentSettings && !this.isDuplicating) {
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

  private applyFormDefaults(): void {
    const formValue = this.calculatorForm.value;
    const purchasePrice = formValue.purchasePrice || 0;
    
    const defaultValues: Partial<RealEstateCalculation> = {
      rehabCosts: formValue.rehabCosts || 0,
      closingCosts: formValue.closingCosts || 0,
      // Default down payment to 100 if blank, unless using percentage mode
      downPayment: formValue.downPayment || (formValue.usePercentageForDownPayment ? 20 : 100),
      insuranceCost: formValue.insuranceCost || 0,
      mortgageInsurance: formValue.mortgageInsurance || 0,
      propertyTaxes: formValue.propertyTaxes || 0,
      expectedRentalIncome: formValue.expectedRentalIncome || 0,
      operatingExpenses: formValue.operatingExpenses || 0,
      capitalExpenditures: formValue.capitalExpenditures || 0,
      appreciationRate: formValue.appreciationRate || 0,
      scheduleEDeductibleAmount: formValue.scheduleEDeductibleAmount || 0
    };

    // Apply the defaults to the form
    this.calculatorForm.patchValue(defaultValues);
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

  get isLoadedCalculation(): boolean {
    return this.currentCalculationId !== null;
  }

  private loadCalculationIntoForm(calculation: SavedCalculation): void {
    // Track the current calculation ID for potential overwrite
    this.currentCalculationId = calculation.id || null;
    
    // Store the original calculation for cancel functionality
    this.originalCalculation = { ...calculation };
    
    // Set the calculation name for the save input
    this.calculationName = calculation.name || '';
    
    // Set the portfolio
    this.selectedPortfolioId = calculation.portfolioId || calculation.scenarioId || 1;
    
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

  private populateFormFromCalculation(calculation: SavedCalculation): void {
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
    // Apply defaults for any blank fields before validation
    this.applyFormDefaults();
    
    if (this.calculatorForm.valid) {
      const calculation: RealEstateCalculation = this.calculatorForm.value;
      this.results = this.calculatorService.calculateResults(calculation);
      
      // Auto-save if this is a loaded calculation
      if (this.isLoadedCalculation && this.calculationName.trim()) {
        this.autoSaveCalculation();
      }
      
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

  private autoSaveCalculation(): void {
    if (this.results && this.calculatorForm.valid && this.calculationName.trim() && this.currentCalculationId) {
      const savedCalculation: SavedCalculation = {
        ...this.calculatorForm.value,
        id: this.currentCalculationId,
        name: this.calculationName.trim(),
        results: this.results,
        portfolioId: this.selectedPortfolioId,
        scenarioId: this.selectedPortfolioId, // For backward compatibility
        updatedAt: new Date()
      };

      this.dbService.saveCalculation(savedCalculation).subscribe({
        next: (saved) => {
          // Update the original calculation reference
          this.originalCalculation = { ...saved };
          this.snackBar.open('Calculation updated automatically', 'Close', {
            duration: 2000
          });
        },
        error: (error) => {
          console.error('Error auto-saving calculation:', error);
          this.snackBar.open('Error auto-saving calculation', 'Close', {
            duration: 3000
          });
        }
      });
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
          portfolioId: this.selectedPortfolioId,
          scenarioId: this.selectedPortfolioId, // For backward compatibility
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
          portfolioId: this.selectedPortfolioId,
          scenarioId: this.selectedPortfolioId, // For backward compatibility
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
    this.originalCalculation = null; // Clear original calculation reference
    this.isDuplicating = false; // Clear duplication flag
    this.results = null;
    this.calculationName = '';
    this.selectedPortfolioId = 1; // Reset to default portfolio
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

  createNewPortfolio(): void {
    if (this.newPortfolioName.trim()) {
      this.portfolioService.createNewPortfolio(this.newPortfolioName.trim()).subscribe({
        next: (newPortfolio) => {
          this.portfolios.push(newPortfolio);
          this.selectedPortfolioId = newPortfolio.id || 1;
          this.newPortfolioName = '';
          this.snackBar.open(`Portfolio "${newPortfolio.name}" created!`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error creating portfolio:', error);
          this.snackBar.open('Error creating portfolio', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  onCancel(): void {
    if (this.originalCalculation) {
      // Reset form to original calculation values
      this.loadCalculationIntoForm(this.originalCalculation);
      this.snackBar.open('Changes cancelled, reverted to saved version', 'Close', {
        duration: 3000
      });
      
      // Switch back to calculator tab
      if (this.tabGroup) {
        this.tabGroup.selectedIndex = 0;
      }
    }
  }

  openSettings(): void {
    const dialogRef = this.dialog.open(SettingsComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Settings were saved, show a message
        this.snackBar.open('Settings updated successfully', 'Close', {
          duration: 3000
        });
        
        // Reload current settings to pick up any changes
        this.settingsService.getSettings().subscribe(settings => {
          this.currentSettings = settings;
        });
      }
    });
  }
}
