import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from '../services/calculator-data.service';
import { RealEstateCalculatorService } from '../services/real-estate-calculator.service';
import { SavedCalculation, CalculationResults } from '../models/real-estate.interface';

@Component({
  selector: 'app-saved-calculations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="saved-calculations-container">
      <mat-card class="saved-calculations-card">
        <mat-card-header>
          <mat-card-title>Portfolio</mat-card-title>
          <mat-card-subtitle>Manage your real estate investment portfolio</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Portfolio Summary Section -->
          <div class="portfolio-section" *ngIf="savedCalculations.length > 0">
            <div class="portfolio-controls">
              <h3>Portfolio Summary</h3>
              <div class="controls-row">
                <button mat-raised-button 
                        color="primary" 
                        (click)="selectAll()"
                        [disabled]="selectedCalculations.size === savedCalculations.length">
                  Select All
                </button>
                <button mat-stroked-button 
                        (click)="clearSelection()"
                        [disabled]="selectedCalculations.size === 0">
                  Clear Selection
                </button>
                <span class="selection-count">{{ selectedCalculations.size }} of {{ savedCalculations.length }} selected</span>
              </div>
            </div>
            
            <!-- Portfolio Summary Results -->
            <mat-card class="portfolio-summary-card" *ngIf="selectedCalculations.size > 0">
              <mat-card-header>
                <mat-card-title>Combined Portfolio Analysis</mat-card-title>
                <mat-card-subtitle>{{ selectedCalculations.size }} Properties Selected</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="portfolio-results-grid">
                  <div class="result-item">
                    <span>Total Cash Invested:</span>
                    <span class="value highlight">{{ portfolioSummary.totalCashInvested | currency }}</span>
                  </div>
                  <div class="result-item">
                    <span>Combined Monthly Cash Flow:</span>
                    <span class="value" [class.positive]="portfolioSummary.monthlyCashFlow > 0" [class.negative]="portfolioSummary.monthlyCashFlow < 0">
                      {{ portfolioSummary.monthlyCashFlow | currency }}
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Combined Annual Cash Flow:</span>
                    <span class="value" [class.positive]="portfolioSummary.annualCashFlow > 0" [class.negative]="portfolioSummary.annualCashFlow < 0">
                      {{ portfolioSummary.annualCashFlow | currency }}
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Portfolio Cash-on-Cash Return:</span>
                    <span class="value highlight" [class.positive]="portfolioSummary.cashOnCashReturn > 0" [class.negative]="portfolioSummary.cashOnCashReturn < 0">
                      {{ portfolioSummary.cashOnCashReturn | number:'1.2-2' }}%
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Combined Monthly Total Return:</span>
                    <span class="value highlight" [class.positive]="portfolioSummary.monthlyTotalReturn > 0" [class.negative]="portfolioSummary.monthlyTotalReturn < 0">
                      {{ portfolioSummary.monthlyTotalReturn | currency }}
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Combined Yearly Total Return:</span>
                    <span class="value highlight" [class.positive]="portfolioSummary.yearlyTotalReturn > 0" [class.negative]="portfolioSummary.yearlyTotalReturn < 0">
                      {{ portfolioSummary.yearlyTotalReturn | currency }}
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Combined Annual Taxable Income:</span>
                    <span class="value" [class.positive]="portfolioSummary.taxableIncome > 0" [class.negative]="portfolioSummary.taxableIncome < 0">
                      {{ portfolioSummary.taxableIncome | currency }}
                    </span>
                  </div>
                  <div class="result-item">
                    <span>Total Annual Depreciation:</span>
                    <span class="value positive">{{ portfolioSummary.annualDepreciation | currency }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="calculations-grid" *ngIf="savedCalculations.length > 0; else noCalculations">
            <mat-card class="calculation-card" *ngFor="let calculation of savedCalculations">
              <mat-card-header>
                <div class="card-header-content">
                  <mat-checkbox 
                    [checked]="selectedCalculations.has(calculation.id!)"
                    (change)="toggleSelection(calculation)"
                    class="property-checkbox">
                  </mat-checkbox>
                  <div class="header-text">
                    <mat-card-title>
                      <a class="calculation-name-link" (click)="loadCalculation(calculation)">
                        {{ calculation.name }}
                      </a>
                    </mat-card-title>
                    <mat-card-subtitle>{{ calculation.createdAt | date:'medium' }}</mat-card-subtitle>
                  </div>
                </div>
              </mat-card-header>
              
              <mat-card-content>
                <div class="calculation-summary">
                  <div class="summary-item">
                    <span>Purchase Price:</span>
                    <span>{{ calculation.purchasePrice | currency }}</span>
                  </div>
                  <div class="summary-item">
                    <span>Total Cash Invested:</span>
                    <span>{{ calculation.results?.totalCashInvested | currency }}</span>
                  </div>
                  <div class="summary-item">
                    <span>Monthly Cash Flow:</span>
                    <span [class.positive]="calculation.results && calculation.results.monthlyCashFlow > 0" 
                          [class.negative]="calculation.results && calculation.results.monthlyCashFlow < 0">
                      {{ calculation.results?.monthlyCashFlow | currency }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span>Monthly Total Return:</span>
                    <span [class.positive]="calculation.results && calculation.results.monthlyTotalReturn > 0" 
                          [class.negative]="calculation.results && calculation.results.monthlyTotalReturn < 0">
                      {{ calculation.results?.monthlyTotalReturn | currency }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span>Monthly Return %:</span>
                    <span [class.positive]="calculation.results && calculation.results.monthlyReturnPercentage > 0" 
                          [class.negative]="calculation.results && calculation.results.monthlyReturnPercentage < 0">
                      {{ calculation.results?.monthlyReturnPercentage | number:'1.2-2' }}%
                    </span>
                  </div>
                  <div class="summary-item">
                    <span>Yearly Total Return:</span>
                    <span [class.positive]="calculation.results && calculation.results.yearlyTotalReturn > 0" 
                          [class.negative]="calculation.results && calculation.results.yearlyTotalReturn < 0">
                      {{ calculation.results?.yearlyTotalReturn | currency }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span>Yearly Return %:</span>
                    <span [class.positive]="calculation.results && calculation.results.yearlyReturnPercentage > 0" 
                          [class.negative]="calculation.results && calculation.results.yearlyReturnPercentage < 0">
                      {{ calculation.results?.yearlyReturnPercentage | number:'1.2-2' }}%
                    </span>
                  </div>
                </div>
                <p *ngIf="calculation.description" class="description">
                  {{ calculation.description }}
                </p>
              </mat-card-content>
              
              <mat-card-actions>
                <button mat-button (click)="renameCalculation(calculation)">
                  <mat-icon>edit_note</mat-icon>
                  Rename
                </button>
                <button mat-button color="accent" (click)="duplicateCalculation(calculation)">
                  <mat-icon>content_copy</mat-icon>
                  Duplicate
                </button>
                <button mat-button color="warn" (click)="deleteCalculation(calculation)">
                  <mat-icon>delete</mat-icon>
                  Delete
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
          
          <ng-template #noCalculations>
            <div class="no-calculations">
              <mat-icon class="large-icon">calculate</mat-icon>
              <h3>No saved calculations</h3>
              <p>Start by creating a calculation and saving it for future reference.</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./saved-calculations.component.css']
})
export class SavedCalculationsComponent implements OnInit {
  savedCalculations: SavedCalculation[] = [];
  selectedCalculations = new Set<number>();
  portfolioSummary: any = {};

  private dbService = inject(IndexedDbService);
  private calculatorDataService = inject(CalculatorDataService);
  private calculatorService = inject(RealEstateCalculatorService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadSavedCalculations();
  }

  private loadSavedCalculations(): void {
    this.dbService.getAllCalculations().subscribe({
      next: (calculations) => {
        this.savedCalculations = calculations.sort((a, b) => 
          (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
        );
      },
      error: (error) => {
        console.error('Error loading calculations:', error);
        this.snackBar.open('Error loading saved calculations', 'Close', {
          duration: 3000
        });
      }
    });
  }

  loadCalculation(calculation: SavedCalculation): void {
    // Load the calculation into the shared service
    this.calculatorDataService.loadCalculation(calculation);
    
    // Navigate to the calculator with the calculation ID as a query parameter
    this.router.navigate(['/calculator'], { queryParams: { id: calculation.id } }).then(() => {
      // Show success message
      this.snackBar.open(`Loaded "${calculation.name}" into calculator`, 'Close', {
        duration: 3000
      });
    });
  }

  duplicateCalculation(calculation: SavedCalculation): void {
    const duplicatedCalculation: SavedCalculation = {
      ...calculation,
      id: undefined,
      name: `${calculation.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dbService.saveCalculation(duplicatedCalculation).subscribe({
      next: () => {
        this.loadSavedCalculations();
        this.snackBar.open('Calculation duplicated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error duplicating calculation:', error);
        this.snackBar.open('Error duplicating calculation', 'Close', {
          duration: 3000
        });
      }
    });
  }

  deleteCalculation(calculation: SavedCalculation): void {
    if (calculation.id && confirm(`Are you sure you want to delete "${calculation.name}"?`)) {
      this.dbService.deleteCalculation(calculation.id).subscribe({
        next: () => {
          this.loadSavedCalculations();
          this.snackBar.open('Calculation deleted successfully!', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error deleting calculation:', error);
          this.snackBar.open('Error deleting calculation', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  toggleSelection(calculation: SavedCalculation): void {
    if (calculation.id) {
      if (this.selectedCalculations.has(calculation.id)) {
        this.selectedCalculations.delete(calculation.id);
      } else {
        this.selectedCalculations.add(calculation.id);
      }
      this.calculatePortfolioSummary();
    }
  }

  selectAll(): void {
    this.savedCalculations.forEach(calc => {
      if (calc.id) {
        this.selectedCalculations.add(calc.id);
      }
    });
    this.calculatePortfolioSummary();
  }

  clearSelection(): void {
    this.selectedCalculations.clear();
    this.portfolioSummary = {};
  }

  private calculatePortfolioSummary(): void {
    if (this.selectedCalculations.size === 0) {
      this.portfolioSummary = {};
      return;
    }

    const selectedCalcs = this.savedCalculations.filter(calc => 
      calc.id && this.selectedCalculations.has(calc.id) && calc.results
    );

    if (selectedCalcs.length === 0) {
      this.portfolioSummary = {};
      return;
    }

    // Aggregate all the values
    this.portfolioSummary = {
      totalCashInvested: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.totalCashInvested || 0), 0),
      monthlyCashFlow: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.monthlyCashFlow || 0), 0),
      annualCashFlow: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.annualCashFlow || 0), 0),
      monthlyTotalReturn: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.monthlyTotalReturn || 0), 0),
      yearlyTotalReturn: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.yearlyTotalReturn || 0), 0),
      taxableIncome: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.taxableIncome || 0), 0),
      annualDepreciation: selectedCalcs.reduce((sum, calc) => sum + (calc.results!.annualDepreciation || 0), 0)
    };

    // Calculate portfolio cash-on-cash return
    this.portfolioSummary.cashOnCashReturn = this.portfolioSummary.totalCashInvested > 0 
      ? (this.portfolioSummary.annualCashFlow / this.portfolioSummary.totalCashInvested) * 100 
      : 0;
  }

  renameCalculation(calculation: SavedCalculation): void {
    const newName = prompt('Enter new name for this property:', calculation.name);
    if (newName && newName.trim() && newName.trim() !== calculation.name) {
      const trimmedName = newName.trim();
      
      // Check if name already exists
      const nameExists = this.savedCalculations.some(calc => 
        calc.id !== calculation.id && calc.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (nameExists) {
        this.snackBar.open('A property with this name already exists', 'Close', {
          duration: 3000
        });
        return;
      }

      const updatedCalculation: SavedCalculation = {
        ...calculation,
        name: trimmedName,
        updatedAt: new Date()
      };

      this.dbService.saveCalculation(updatedCalculation).subscribe({
        next: () => {
          this.loadSavedCalculations();
          this.snackBar.open(`Property renamed to "${trimmedName}"`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error renaming calculation:', error);
          this.snackBar.open('Error renaming property', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }
}
