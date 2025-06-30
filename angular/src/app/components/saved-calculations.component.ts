import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from '../services/calculator-data.service';
import { RealEstateCalculatorService } from '../services/real-estate-calculator.service';
import { ScenarioService } from '../services/scenario.service';
import { SavedCalculation, CalculationResults, Scenario } from '../models/real-estate.interface';

@Component({
  selector: 'app-saved-calculations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
    DragDropModule
  ],
  template: `
    <div class="saved-calculations-container">
      <mat-card class="saved-calculations-card">
        <mat-card-header>
          <mat-card-title>Portfolio</mat-card-title>
          <mat-card-subtitle>Manage your real estate investment portfolio by scenario</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Portfolio Summary Section -->
          <div class="portfolio-section" *ngIf="getAllCalculations().length > 0">
            <div class="portfolio-controls">
              <h3>Portfolio Summary</h3>
              <div class="controls-row">
                <button mat-raised-button 
                        color="primary" 
                        (click)="selectAll()"
                        [disabled]="selectedCalculations.size === getAllCalculations().length">
                  Select All
                </button>
                <button mat-stroked-button 
                        (click)="clearSelection()"
                        [disabled]="selectedCalculations.size === 0">
                  Clear Selection
                </button>
                <span class="selection-count">{{ selectedCalculations.size }} of {{ getAllCalculations().length }} selected</span>
                <button mat-stroked-button color="primary" (click)="createNewScenario()" class="new-scenario-btn">
                  <mat-icon>add</mat-icon>
                  New Scenario
                </button>
                <button mat-stroked-button color="accent" (click)="toggleScenarioComparison()" class="compare-btn">
                  <mat-icon>compare_arrows</mat-icon>
                  {{ showScenarioComparison ? 'Hide' : 'Compare' }} Scenarios
                </button>
              </div>
            </div>
            
            <!-- Scenario Comparison Section -->
            <div class="scenario-comparison-section" *ngIf="showScenarioComparison && scenarios.length > 1">
              <mat-card class="comparison-card">
                <mat-card-header>
                  <mat-card-title>Scenario Comparison</mat-card-title>
                  <mat-card-subtitle>Select scenarios to compare their performance</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="scenario-selection">
                    <h4>Select Scenarios to Compare:</h4>
                    <div class="scenario-checkboxes">
                      <mat-checkbox 
                        *ngFor="let scenario of scenarios" 
                        [checked]="selectedScenariosForComparison.has(scenario.id!)"
                        (change)="toggleScenarioForComparison(scenario)"
                        class="scenario-checkbox">
                        {{ scenario.name }} ({{ getCalculationsForScenario(scenario.id!).length }} properties)
                      </mat-checkbox>
                    </div>
                  </div>
                  
                  <!-- Comparison Results -->                    <div class="comparison-results" *ngIf="selectedScenariosForComparison.size >= 2">
                      <h4>Comparison Results:</h4>
                      <div class="comparison-table-wrapper">
                        <table class="comparison-table">
                          <thead>
                            <tr>
                              <th class="metric-header">Metric</th>
                              <th class="scenario-header" *ngFor="let scenarioId of getSelectedScenarioIds()">
                                {{ getScenarioName(scenarioId) }}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let metric of comparisonMetrics">
                              <td class="metric-name">{{ metric.label }}</td>
                              <td class="metric-value" *ngFor="let scenarioId of getSelectedScenarioIds()"
                                   [class.positive]="getScenarioMetricValue(scenarioId, metric.key) > 0"
                                   [class.negative]="getScenarioMetricValue(scenarioId, metric.key) < 0">
                                {{ formatMetricValue(getScenarioMetricValue(scenarioId, metric.key), metric.format) }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    
                    <!-- Best Performance Highlights -->
                    <div class="performance-highlights">
                      <h4>Performance Highlights:</h4>
                      <div class="highlights-grid">
                        <div class="highlight-item" *ngFor="let highlight of getPerformanceHighlights()">
                          <div class="highlight-metric">{{ highlight.metric }}</div>
                          <div class="highlight-scenario">{{ highlight.scenarioName }}</div>
                          <div class="highlight-value">{{ highlight.value }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="comparison-hint" *ngIf="selectedScenariosForComparison.size < 2">
                    <p>Select at least 2 scenarios to see the comparison.</p>
                  </div>
                </mat-card-content>
              </mat-card>
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

          <!-- Scenarios with drag and drop -->
          <div class="scenarios-container" *ngIf="scenarios.length > 0 && getAllCalculations().length > 0">
            <div class="scenario-section" *ngFor="let scenario of scenarios">
              <mat-card class="scenario-card">
                <mat-card-header>
                  <div class="scenario-header">
                    <mat-card-title>
                      {{ scenario.name }}
                      <span class="calculation-count">({{ getCalculationsForScenario(scenario.id!).length }})</span>
                    </mat-card-title>
                    <mat-card-subtitle>{{ scenario.description }}</mat-card-subtitle>
                  </div>
                  <div class="scenario-actions">
                    <button mat-icon-button (click)="renameScenario(scenario)" matTooltip="Rename scenario">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteScenario(scenario)" matTooltip="Delete scenario" 
                            [disabled]="scenarios.length <= 1">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="scenario-calculations" 
                       cdkDropList 
                       [id]="'scenario-' + scenario.id"
                       [cdkDropListData]="getCalculationsForScenario(scenario.id!)"
                       [cdkDropListConnectedTo]="getDropListIds()"
                       (cdkDropListDropped)="onDrop($event, scenario.id!)">
                    
                    <div class="calculation-card" 
                         cdkDrag
                         *ngFor="let calculation of getCalculationsForScenario(scenario.id!)">
                      
                      <div class="drag-placeholder" *cdkDragPlaceholder></div>
                      
                      <mat-card class="property-card">
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
                            <mat-icon class="drag-handle" cdkDragHandle>drag_handle</mat-icon>
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
                    
                    <!-- Empty scenario placeholder -->
                    <div class="empty-scenario" *ngIf="getCalculationsForScenario(scenario.id!).length === 0">
                      <mat-icon class="empty-icon">folder_open</mat-icon>
                      <p>No properties in this scenario</p>
                      <p class="hint">Drag calculations here or create new ones</p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
          
          <ng-template #noCalculations>
            <div class="no-calculations">
              <mat-icon class="large-icon">calculate</mat-icon>
              <h3>No saved calculations</h3>
              <p>Start by creating a calculation and saving it for future reference.</p>
              <button mat-raised-button color="primary" [routerLink]="['/calculator']">
                Create First Calculation
              </button>
            </div>
          </ng-template>
          
          <!-- Show no calculations template when there are no calculations -->
          <div *ngIf="getAllCalculations().length === 0">
            <ng-container *ngTemplateOutlet="noCalculations"></ng-container>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./saved-calculations.component.css']
})
export class SavedCalculationsComponent implements OnInit {
  scenarios: Scenario[] = [];
  scenarioCalculations: { [scenarioId: number]: SavedCalculation[] } = {};
  selectedCalculations = new Set<number>();
  portfolioSummary: any = {};
  
  // Scenario comparison properties
  showScenarioComparison = false;
  selectedScenariosForComparison = new Set<number>();
  scenarioSummaries: { [scenarioId: number]: any } = {};
  
  comparisonMetrics = [
    { key: 'totalProperties', label: 'Total Properties', format: 'number' },
    { key: 'totalCashInvested', label: 'Total Cash Invested', format: 'currency' },
    { key: 'monthlyCashFlow', label: 'Monthly Cash Flow', format: 'currency' },
    { key: 'annualCashFlow', label: 'Annual Cash Flow', format: 'currency' },
    { key: 'monthlyTotalReturn', label: 'Monthly Total Return', format: 'currency' },
    { key: 'yearlyTotalReturn', label: 'Yearly Total Return', format: 'currency' },
    { key: 'cashOnCashReturn', label: 'Cash-on-Cash Return', format: 'percentage' },
    { key: 'taxableIncome', label: 'Annual Taxable Income', format: 'currency' },
    { key: 'annualDepreciation', label: 'Annual Depreciation', format: 'currency' }
  ];

  private dbService = inject(IndexedDbService);
  private calculatorDataService = inject(CalculatorDataService);
  private calculatorService = inject(RealEstateCalculatorService);
  private scenarioService = inject(ScenarioService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadScenariosAndCalculations();
  }

  private loadScenariosAndCalculations(): void {
    // Load scenarios first
    this.scenarioService.getAllScenarios().subscribe({
      next: (scenarios) => {
        console.log('Loaded scenarios:', scenarios);
        this.scenarios = scenarios;
        // Ensure default scenario exists
        if (scenarios.length === 0) {
          this.scenarioService.createNewScenario('My Portfolio', 'Default portfolio scenario').subscribe({
            next: (defaultScenario) => {
              console.log('Created default scenario:', defaultScenario);
              this.scenarios = [defaultScenario];
              this.loadCalculationsForScenarios();
            }
          });
        } else {
          this.loadCalculationsForScenarios();
        }
      },
      error: (error) => {
        console.error('Error loading scenarios:', error);
      }
    });
  }

  private loadCalculationsForScenarios(): void {
    this.dbService.getAllCalculations().subscribe({
      next: (calculations) => {
        console.log('Loaded calculations:', calculations);
        // Organize calculations by scenario
        this.scenarioCalculations = {};
        
        // Initialize empty arrays for each scenario
        this.scenarios.forEach(scenario => {
          this.scenarioCalculations[scenario.id || 1] = [];
        });
        
        // Sort calculations into scenarios
        calculations
          .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
          .forEach(calc => {
            const scenarioId = calc.scenarioId || 1;
            if (!this.scenarioCalculations[scenarioId]) {
              this.scenarioCalculations[scenarioId] = [];
            }
            this.scenarioCalculations[scenarioId].push(calc);
          });
        
        console.log('Organized calculations by scenario:', this.scenarioCalculations);
        
        // Calculate scenario summaries for comparison
        this.calculateScenarioSummaries();
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
    console.log('Duplicating calculation:', calculation.id, calculation.name);
    
    // Navigate to calculator and load the calculation data for editing
    // This allows users to make changes before saving with a new name
    this.router.navigate(['/calculator'], { 
      queryParams: { 
        duplicate: calculation.id,
        name: `${calculation.name} (Copy)`
      } 
    }).then(() => {
      console.log('Navigation completed to /calculator with params');
    });
    
    this.snackBar.open('Calculation loaded for editing. Make changes and save with a new name.', 'Close', {
      duration: 4000
    });
  }

  onDrop(event: CdkDragDrop<SavedCalculation[]>, targetScenarioId: number): void {
    console.log('Drop event:', {
      previousContainer: event.previousContainer.id,
      currentContainer: event.container.id,
      targetScenarioId,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      sameContainer: event.previousContainer === event.container
    });

    if (event.previousContainer === event.container) {
      // Reordering within the same scenario
      console.log('Reordering within same scenario');
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Moving between scenarios
      console.log('Moving between scenarios');
      const calculation = event.previousContainer.data[event.previousIndex];
      console.log('Moving calculation:', calculation.name, 'to scenario:', targetScenarioId);
      
      // Update the calculation's scenario
      const updatedCalculation: SavedCalculation = {
        ...calculation,
        scenarioId: targetScenarioId,
        updatedAt: new Date()
      };

      this.dbService.saveCalculation(updatedCalculation).subscribe({
        next: () => {
          console.log('Successfully saved calculation with new scenario');
          // Move the item between containers
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
          
          this.snackBar.open(`Moved "${calculation.name}" to ${this.getScenarioName(targetScenarioId)}`, 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error moving calculation:', error);
          this.snackBar.open('Error moving calculation', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  getScenarioName(scenarioId: number): string {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    return scenario ? scenario.name : 'Unknown Scenario';
  }

  getAllCalculations(): SavedCalculation[] {
    const allCalculations: SavedCalculation[] = [];
    Object.values(this.scenarioCalculations).forEach(calculations => {
      allCalculations.push(...calculations);
    });
    return allCalculations;
  }

  getCalculationsForScenario(scenarioId: number): SavedCalculation[] {
    return this.scenarioCalculations[scenarioId] || [];
  }

  getDropListIds(): string[] {
    const allIds = this.scenarios.map(scenario => `scenario-${scenario.id}`);
    console.log('All drop list IDs:', allIds);
    return allIds;
  }

  getConnectedDropLists(currentScenarioId: number): string[] {
    // Return all scenario IDs except the current one to allow cross-scenario drops
    const connectedIds = this.scenarios
      .filter(scenario => scenario.id !== currentScenarioId)
      .map(scenario => `scenario-${scenario.id}`);
    console.log(`Connected drop lists for scenario ${currentScenarioId}:`, connectedIds);
    return connectedIds;
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

  createNewScenario(): void {
    const name = prompt('Enter scenario name:');
    if (name && name.trim()) {
      const description = prompt('Enter scenario description (optional):') || '';
      
      this.scenarioService.createNewScenario(name.trim(), description.trim()).subscribe({
        next: (newScenario) => {
          this.scenarios.push(newScenario);
          this.scenarioCalculations[newScenario.id!] = [];
          this.snackBar.open(`Scenario "${newScenario.name}" created successfully!`, 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error creating scenario:', error);
          this.snackBar.open('Error creating scenario', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  renameScenario(scenario: Scenario): void {
    const newName = prompt('Enter new scenario name:', scenario.name);
    if (newName && newName.trim() && newName.trim() !== scenario.name) {
      const trimmedName = newName.trim();
      
      // Check if name already exists
      const nameExists = this.scenarios.some(s => 
        s.id !== scenario.id && s.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (nameExists) {
        this.snackBar.open('A scenario with this name already exists', 'Close', {
          duration: 3000
        });
        return;
      }

      const updatedScenario: Scenario = {
        ...scenario,
        name: trimmedName,
        updatedAt: new Date()
      };

      this.scenarioService.saveScenario(updatedScenario).subscribe({
        next: () => {
          const index = this.scenarios.findIndex(s => s.id === scenario.id);
          if (index !== -1) {
            this.scenarios[index] = updatedScenario;
          }
          this.snackBar.open(`Scenario renamed to "${trimmedName}"`, 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error renaming scenario:', error);
          this.snackBar.open('Error renaming scenario', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  deleteScenario(scenario: Scenario): void {
    if (this.scenarios.length <= 1) {
      this.snackBar.open('Cannot delete the last scenario', 'Close', {
        duration: 3000
      });
      return;
    }

    const calculationsCount = this.getCalculationsForScenario(scenario.id!).length;
    let confirmMessage = `Are you sure you want to delete scenario "${scenario.name}"?`;
    
    if (calculationsCount > 0) {
      confirmMessage += ` This will move ${calculationsCount} calculation(s) to the first scenario.`;
    }

    if (confirm(confirmMessage)) {
      const firstScenario = this.scenarios.find(s => s.id !== scenario.id);
      const calculationsToMove = this.getCalculationsForScenario(scenario.id!);

      // Move calculations to the first remaining scenario
      if (calculationsToMove.length > 0 && firstScenario) {
        const updatePromises = calculationsToMove.map(calc => {
          const updatedCalc: SavedCalculation = {
            ...calc,
            scenarioId: firstScenario.id!,
            updatedAt: new Date()
          };
          return this.dbService.saveCalculation(updatedCalc).toPromise();
        });

        Promise.all(updatePromises).then(() => {
          this.deleteScenarioFromDb(scenario);
        }).catch(error => {
          console.error('Error moving calculations:', error);
          this.snackBar.open('Error moving calculations to another scenario', 'Close', {
            duration: 3000
          });
        });
      } else {
        this.deleteScenarioFromDb(scenario);
      }
    }
  }

  private deleteScenarioFromDb(scenario: Scenario): void {
    this.scenarioService.deleteScenario(scenario.id!).subscribe({
      next: () => {
        this.scenarios = this.scenarios.filter(s => s.id !== scenario.id);
        delete this.scenarioCalculations[scenario.id!];
        this.loadCalculationsForScenarios(); // Refresh to show moved calculations
        this.snackBar.open(`Scenario "${scenario.name}" deleted successfully!`, 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error deleting scenario:', error);
        this.snackBar.open('Error deleting scenario', 'Close', {
          duration: 3000
        });
      }
    });
  }

  selectAll(): void {
    this.getAllCalculations().forEach(calc => {
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

    const selectedCalcs = this.getAllCalculations().filter(calc => 
      calc.id && this.selectedCalculations.has(calc.id) && calc.results
    );

    if (selectedCalcs.length === 0) {
      this.portfolioSummary = {};
      return;
    }

    // Aggregate all the values
    this.portfolioSummary = {
      totalCashInvested: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.totalCashInvested || 0), 0),
      monthlyCashFlow: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.monthlyCashFlow || 0), 0),
      annualCashFlow: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.annualCashFlow || 0), 0),
      monthlyTotalReturn: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.monthlyTotalReturn || 0), 0),
      yearlyTotalReturn: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.yearlyTotalReturn || 0), 0),
      taxableIncome: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.taxableIncome || 0), 0),
      annualDepreciation: selectedCalcs.reduce((sum: number, calc: SavedCalculation) => sum + (calc.results!.annualDepreciation || 0), 0)
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
      const nameExists = this.getAllCalculations().some(calc => 
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
          this.loadCalculationsForScenarios();
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

  deleteCalculation(calculation: SavedCalculation): void {
    if (calculation.id && confirm(`Are you sure you want to delete "${calculation.name}"?`)) {
      this.dbService.deleteCalculation(calculation.id).subscribe({
        next: () => {
          this.loadScenariosAndCalculations();
          this.snackBar.open('Calculation deleted successfully!', 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error deleting calculation:', error);
          this.snackBar.open('Error deleting calculation', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  // Scenario comparison methods
  toggleScenarioComparison(): void {
    this.showScenarioComparison = !this.showScenarioComparison;
    if (this.showScenarioComparison) {
      this.calculateScenarioSummaries();
    }
  }

  toggleScenarioForComparison(scenario: Scenario): void {
    if (this.selectedScenariosForComparison.has(scenario.id!)) {
      this.selectedScenariosForComparison.delete(scenario.id!);
    } else {
      this.selectedScenariosForComparison.add(scenario.id!);
    }
  }

  getSelectedScenarioIds(): number[] {
    return Array.from(this.selectedScenariosForComparison);
  }

  private calculateScenarioSummaries(): void {
    this.scenarioSummaries = {};
    
    this.scenarios.forEach(scenario => {
      const calculations = this.getCalculationsForScenario(scenario.id!);
      const validCalculations = calculations.filter(calc => calc.results);
      
      if (validCalculations.length === 0) {
        this.scenarioSummaries[scenario.id!] = {
          totalProperties: 0,
          totalCashInvested: 0,
          monthlyCashFlow: 0,
          annualCashFlow: 0,
          monthlyTotalReturn: 0,
          yearlyTotalReturn: 0,
          cashOnCashReturn: 0,
          taxableIncome: 0,
          annualDepreciation: 0
        };
        return;
      }

      const summary = validCalculations.reduce((acc, calc) => {
        const results = calc.results!;
        return {
          totalCashInvested: acc.totalCashInvested + (results.totalCashInvested || 0),
          monthlyCashFlow: acc.monthlyCashFlow + (results.monthlyCashFlow || 0),
          annualCashFlow: acc.annualCashFlow + (results.annualCashFlow || 0),
          monthlyTotalReturn: acc.monthlyTotalReturn + (results.monthlyTotalReturn || 0),
          yearlyTotalReturn: acc.yearlyTotalReturn + (results.yearlyTotalReturn || 0),
          taxableIncome: acc.taxableIncome + (results.taxableIncome || 0),
          annualDepreciation: acc.annualDepreciation + (results.annualDepreciation || 0)
        };
      }, {
        totalCashInvested: 0,
        monthlyCashFlow: 0,
        annualCashFlow: 0,
        monthlyTotalReturn: 0,
        yearlyTotalReturn: 0,
        taxableIncome: 0,
        annualDepreciation: 0
      });

      // Calculate cash-on-cash return
      const cashOnCashReturn = summary.totalCashInvested > 0 
        ? (summary.annualCashFlow / summary.totalCashInvested) * 100 
        : 0;

      this.scenarioSummaries[scenario.id!] = {
        totalProperties: validCalculations.length,
        ...summary,
        cashOnCashReturn
      };
    });
  }

  getScenarioMetricValue(scenarioId: number, metricKey: string): number {
    return this.scenarioSummaries[scenarioId]?.[metricKey] || 0;
  }

  formatMetricValue(value: number, format: string): string {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toString();
      default:
        return value.toString();
    }
  }

  getPerformanceHighlights(): any[] {
    if (this.selectedScenariosForComparison.size < 2) return [];

    const highlights: any[] = [];
    const selectedIds = this.getSelectedScenarioIds();
    
    // Find best performers for key metrics
    const keyMetrics = [
      { key: 'cashOnCashReturn', label: 'Best Cash-on-Cash Return', format: 'percentage' },
      { key: 'monthlyTotalReturn', label: 'Highest Monthly Return', format: 'currency' },
      { key: 'yearlyTotalReturn', label: 'Highest Yearly Return', format: 'currency' },
      { key: 'annualCashFlow', label: 'Best Annual Cash Flow', format: 'currency' }
    ];

    keyMetrics.forEach(metric => {
      let bestValue = Number.NEGATIVE_INFINITY;
      let bestScenarioId = 0;

      selectedIds.forEach(scenarioId => {
        const value = this.getScenarioMetricValue(scenarioId, metric.key);
        if (value > bestValue) {
          bestValue = value;
          bestScenarioId = scenarioId;
        }
      });

      if (bestScenarioId > 0) {
        highlights.push({
          metric: metric.label,
          scenarioName: this.getScenarioName(bestScenarioId),
          value: this.formatMetricValue(bestValue, metric.format)
        });
      }
    });

    return highlights;
  }
}
