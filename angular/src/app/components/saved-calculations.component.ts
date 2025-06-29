import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from '../services/calculator-data.service';
import { SavedCalculation } from '../models/real-estate.interface';

@Component({
  selector: 'app-saved-calculations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="saved-calculations-container">
      <mat-card class="saved-calculations-card">
        <mat-card-header>
          <mat-card-title>Saved Calculations</mat-card-title>
          <mat-card-subtitle>Manage your saved real estate calculations</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="calculations-grid" *ngIf="savedCalculations.length > 0; else noCalculations">
            <mat-card class="calculation-card" *ngFor="let calculation of savedCalculations">
              <mat-card-header>
                <mat-card-title>{{ calculation.name }}</mat-card-title>
                <mat-card-subtitle>{{ calculation.createdAt | date:'medium' }}</mat-card-subtitle>
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
                <button mat-button color="primary" (click)="loadCalculation(calculation)">
                  <mat-icon>edit</mat-icon>
                  Load
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

  constructor(
    private dbService: IndexedDbService,
    private calculatorDataService: CalculatorDataService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

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
    
    // Navigate to the calculator
    this.router.navigate(['/calculator']).then(() => {
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
}
