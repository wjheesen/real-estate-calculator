import { Component, OnInit, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { IndexedDbService } from '../services/indexed-db.service';
import { CalculatorDataService } from './calculator-data.service';
import { RealEstateCalculatorService } from '../services/real-estate-calculator.service';
import { PortfolioService } from '../services/portfolio.service';
import { SavedCalculation, CalculationResults, Portfolio } from '../models/real-estate.interface';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Component({
  selector: 'app-portfolios',
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
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    DragDropModule
  ],
  template: `
    <div class="portfolios-container">
      <mat-card class="portfolios-card">
        <mat-card-content>
          <!-- Portfolio Summary Section -->
          <div class="portfolio-section" *ngIf="getAllCalculations().length > 0">
            <div class="portfolio-controls">
              <mat-card-title>Portfolio Management</mat-card-title>
              <div class="controls-row">
                <button mat-stroked-button color="primary" (click)="createNewPortfolio()" class="new-portfolio-btn">
                  <mat-icon>add</mat-icon>
                  New Portfolio
                </button>
                <button mat-stroked-button color="accent" (click)="toggleOrganizeView()" class="organize-btn">
                  <mat-icon>sort</mat-icon>
                  {{ showOrganizeView ? 'Exit' : 'Organize' }} Properties
                </button>
                <button mat-stroked-button color="accent" (click)="goBackToPortfolios()" *ngIf="selectedPortfolioId" class="back-btn">
                  <mat-icon>arrow_back</mat-icon>
                  Back to Portfolios
                </button>
              </div>
            </div>
            
            <!-- Organize Properties View -->
            <div class="organize-view" *ngIf="showOrganizeView">
              <div class="organize-header">
                <h4>Organize Properties by Portfolio</h4>
                <p>Drag and drop properties between portfolios to organize your investments</p>
              </div>
              
              <div class="organize-portfolios-container">
                <div class="organize-portfolio-section" *ngFor="let portfolio of portfolios">
                  <div class="organize-portfolio-header">
                    <h4 class="organize-portfolio-title">
                      {{ portfolio.name }}
                      <span class="calculation-count">({{ getCalculationsForPortfolio(portfolio.id!).length }})</span>
                    </h4>
                    <p class="organize-portfolio-description" *ngIf="portfolio.description">{{ portfolio.description }}</p>
                  </div>
                  
                  <div class="organize-portfolio-calculations" 
                       cdkDropList 
                       [id]="'organize-portfolio-' + portfolio.id"
                       [cdkDropListData]="getCalculationsForPortfolio(portfolio.id!)"
                       [cdkDropListConnectedTo]="getOrganizeDropListIds()"
                       (cdkDropListDropped)="onDrop($event, portfolio.id!)">
                    
                    <div class="organize-calculation-card" 
                         cdkDrag
                         *ngFor="let calculation of getCalculationsForPortfolio(portfolio.id!)">
                      
                      <div class="drag-placeholder" *cdkDragPlaceholder></div>
                      
                      <mat-card class="organize-property-card">
                        <mat-card-header>
                          <div class="organize-card-header-content">
                            <div class="organize-header-text">
                              <mat-card-title>{{ calculation.name }}</mat-card-title>
                              <mat-card-subtitle>{{ calculation.purchasePrice | currency }}</mat-card-subtitle>
                            </div>
                            <mat-icon class="drag-handle" cdkDragHandle>drag_handle</mat-icon>
                          </div>
                        </mat-card-header>
                        
                        <mat-card-content>
                          <div class="organize-calculation-summary">
                            <div class="organize-summary-item">
                              <span>Monthly Cash Flow:</span>
                              <span [class.positive]="calculation.results && calculation.results.monthlyCashFlow > 0" 
                                    [class.negative]="calculation.results && calculation.results.monthlyCashFlow < 0">
                                {{ calculation.results?.monthlyCashFlow | currency }}
                              </span>
                            </div>
                            <div class="organize-summary-item">
                              <span>Monthly Equity Gain:</span>
                              <span [class.positive]="calculation.results && calculation.results.monthlyEquityGain > 0" 
                                    [class.negative]="calculation.results && calculation.results.monthlyEquityGain < 0">
                                {{ calculation.results?.monthlyEquityGain | currency }}
                              </span>
                            </div>
                            <div class="organize-summary-item">
                              <span>Monthly Total Return:</span>
                              <span [class.positive]="calculation.results && calculation.results.monthlyTotalReturn > 0" 
                                    [class.negative]="calculation.results && calculation.results.monthlyTotalReturn < 0">
                                {{ calculation.results?.monthlyTotalReturn | currency }}
                              </span>
                            </div>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    
                    <!-- Empty portfolio placeholder -->
                    <div class="organize-empty-portfolio" *ngIf="getCalculationsForPortfolio(portfolio.id!).length === 0">
                      <mat-icon class="empty-icon">folder_open</mat-icon>
                      <p>No properties in this portfolio</p>
                      <p class="hint">Drag properties here to organize them</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Portfolio Selection View -->
            <div class="portfolio-selection-view" *ngIf="!selectedPortfolioId && !showOrganizeView">
              <h4>Select a Portfolio to View Details</h4>
              <div class="portfolio-selection-grid">
                <mat-card class="portfolio-selection-card" *ngFor="let portfolio of portfolios" (click)="selectPortfolio(portfolio.id!)">
                  <mat-card-header>
                    <mat-card-title>{{ portfolio.name }}</mat-card-title>
                    <mat-card-subtitle>{{ getCalculationsForPortfolio(portfolio.id!).length }} Properties</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="portfolio-preview">
                      <div class="preview-metric" *ngIf="getCalculationsForPortfolio(portfolio.id!).length > 0">
                        <span>Monthly Cash Flow:</span>
                        <span class="value" [class.positive]="getPortfolioMetricValue(portfolio.id!, 'monthlyCashFlow') > 0" 
                              [class.negative]="getPortfolioMetricValue(portfolio.id!, 'monthlyCashFlow') < 0">
                          {{ formatMetricValue(getPortfolioMetricValue(portfolio.id!, 'monthlyCashFlow'), 'currency') }}
                        </span>
                      </div>
                      <div class="preview-metric" *ngIf="getCalculationsForPortfolio(portfolio.id!).length > 0">
                        <span>Monthly Equity Gain:</span>
                        <span class="value" [class.positive]="getPortfolioMetricValue(portfolio.id!, 'monthlyEquityGain') > 0" 
                              [class.negative]="getPortfolioMetricValue(portfolio.id!, 'monthlyEquityGain') < 0">
                          {{ formatMetricValue(getPortfolioMetricValue(portfolio.id!, 'monthlyEquityGain'), 'currency') }}
                        </span>
                      </div>
                      <div class="preview-metric" *ngIf="getCalculationsForPortfolio(portfolio.id!).length > 0">
                        <span>Monthly Total Return:</span>
                        <span class="value" [class.positive]="getPortfolioMetricValue(portfolio.id!, 'monthlyTotalReturn') > 0" 
                              [class.negative]="getPortfolioMetricValue(portfolio.id!, 'monthlyTotalReturn') < 0">
                          {{ formatMetricValue(getPortfolioMetricValue(portfolio.id!, 'monthlyTotalReturn'), 'currency') }}
                        </span>
                      </div>
                      <div class="empty-portfolio-preview" *ngIf="getCalculationsForPortfolio(portfolio.id!).length === 0">
                        <mat-icon>folder_open</mat-icon>
                        <p>No properties</p>
                      </div>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-icon-button (click)="renamePortfolio(portfolio); $event.stopPropagation()" matTooltip="Rename portfolio">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deletePortfolio(portfolio); $event.stopPropagation()" matTooltip="Delete portfolio" 
                            [disabled]="portfolios.length <= 1">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </mat-card-actions>
                </mat-card>
              </div>
            </div>
            
            <!-- Selected Portfolio Details View -->
            <div class="portfolio-details-view" *ngIf="selectedPortfolioId && !showOrganizeView">
              <div class="portfolio-header-section">
                <div class="portfolio-title-section">
                  <mat-card-title>{{ getPortfolioName(selectedPortfolioId) }}
                    <span class="calculation-count">({{ getCalculationsForPortfolio(selectedPortfolioId).length }})</span>
                  </mat-card-title>
                  <div class="portfolio-actions">
                    <button mat-icon-button (click)="renamePortfolio(getPortfolioById(selectedPortfolioId)!)" matTooltip="Rename portfolio">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deletePortfolio(getPortfolioById(selectedPortfolioId)!)" matTooltip="Delete portfolio" 
                            [disabled]="portfolios.length <= 1">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="portfolio-controls">
                  <button mat-stroked-button color="accent" (click)="toggleComparison()" [disabled]="portfolios.length < 2">
                    <mat-icon>compare_arrows</mat-icon>
                    {{ comparisonPortfolioId ? 'Clear Comparison' : 'Quick Compare' }}
                  </button>
                </div>
              </div>

              <!-- Properties Section -->
              <div class="portfolio-calculations" 
                   cdkDropList 
                   [id]="'portfolio-' + selectedPortfolioId"
                   [cdkDropListData]="getCalculationsForPortfolio(selectedPortfolioId)"
                   [cdkDropListConnectedTo]="getDropListIds()"
                   (cdkDropListDropped)="onDrop($event, selectedPortfolioId)">
                        
                        <div class="calculation-card" 
                             cdkDrag
                             *ngFor="let calculation of getCalculationsForPortfolio(selectedPortfolioId)">
                          
                          <div class="drag-placeholder" *cdkDragPlaceholder></div>
                          
                          <mat-card class="property-card">
                            <mat-card-header>
                              <div class="card-header-content">
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
                                  <span>Monthly Equity Gain:</span>
                                  <span [class.positive]="calculation.results && calculation.results.monthlyEquityGain > 0" 
                                        [class.negative]="calculation.results && calculation.results.monthlyEquityGain < 0">
                                    {{ calculation.results?.monthlyEquityGain | currency }}
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
                                        [class.negative]="calculation.results && calculation.results.yearlyReturnPercentage < 0">
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
                        
                        <!-- Empty portfolio placeholder -->
                        <div class="empty-portfolio" *ngIf="getCalculationsForPortfolio(selectedPortfolioId).length === 0">
                          <mat-icon class="empty-icon">folder_open</mat-icon>
                          <p>No properties in this portfolio</p>
                          <p class="hint">Create new calculations and assign them to this portfolio</p>
                        </div>
              </div>
              
              <!-- Portfolio Summary Section -->
              <div class="portfolio-summary-section">
                <mat-card class="summary-comparison-card">
                  <mat-card-header>
                    <mat-card-title>Portfolio Summary</mat-card-title>
                    <mat-card-subtitle *ngIf="!comparisonPortfolioId">
                      Select another portfolio below to compare
                    </mat-card-subtitle>
                    <mat-card-subtitle *ngIf="comparisonPortfolioId">
                      Comparing with {{ getPortfolioName(comparisonPortfolioId) }}
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <!-- Portfolio Selection for Comparison -->
                    <div class="comparison-portfolio-selection" *ngIf="portfolios.length > 1">
                      <mat-form-field>
                        <mat-label>Compare with another portfolio</mat-label>
                        <mat-select [(value)]="comparisonPortfolioId">
                          <mat-option [value]="null">None (single portfolio view)</mat-option>
                          <mat-option *ngFor="let portfolio of portfolios" 
                                      [value]="portfolio.id" 
                                      [disabled]="portfolio.id === selectedPortfolioId">
                            {{ portfolio.name }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <!-- Summary Table (always in comparison format) -->
                    <div class="summary-results" *ngIf="getCalculationsForPortfolio(selectedPortfolioId).length > 0; else emptyPortfolio">
                      <div class="comparison-table-wrapper">
                        <table class="comparison-table">
                          <thead>
                            <tr>
                              <th class="metric-header">Metric</th>
                              <th class="portfolio-header">{{ getPortfolioName(selectedPortfolioId) }}</th>
                              <th class="portfolio-header" *ngIf="comparisonPortfolioId">{{ getPortfolioName(comparisonPortfolioId) }}</th>
                              <th class="difference-header" *ngIf="comparisonPortfolioId">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let metric of comparisonMetrics">
                              <td class="metric-name">{{ metric.label }}</td>
                              <td class="metric-value" 
                                   [class.positive]="getPortfolioMetricValue(selectedPortfolioId, metric.key) > 0"
                                   [class.negative]="getPortfolioMetricValue(selectedPortfolioId, metric.key) < 0">
                                {{ formatMetricValue(getPortfolioMetricValue(selectedPortfolioId, metric.key), metric.format) }}
                              </td>
                              <td class="metric-value" *ngIf="comparisonPortfolioId"
                                   [class.positive]="getPortfolioMetricValue(comparisonPortfolioId, metric.key) > 0"
                                   [class.negative]="getPortfolioMetricValue(comparisonPortfolioId, metric.key) < 0">
                                {{ formatMetricValue(getPortfolioMetricValue(comparisonPortfolioId, metric.key), metric.format) }}
                              </td>
                              <td class="difference-value" *ngIf="comparisonPortfolioId"
                                   [class.better]="getMetricDifference(selectedPortfolioId, comparisonPortfolioId, metric.key) > 0"
                                   [class.worse]="getMetricDifference(selectedPortfolioId, comparisonPortfolioId, metric.key) < 0">
                                {{ formatDifference(getMetricDifference(selectedPortfolioId, comparisonPortfolioId, metric.key), metric.format) }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <ng-template #emptyPortfolio>
                      <div class="empty-portfolio-summary">
                        <mat-icon>folder_open</mat-icon>
                        <p>No properties in this portfolio</p>
                        <p class="hint">Add properties to see portfolio summary</p>
                      </div>
                    </ng-template>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </div>

          
          <ng-template #noCalculations>
            <div class="no-calculations">
              <mat-icon class="large-icon">calculate</mat-icon>
              <mat-card-title>No saved calculations</mat-card-title>
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
  styleUrls: ['./portfolios.component.css']
})
export class PortfoliosComponent implements OnInit {
  portfolios: Portfolio[] = [];
  portfolioCalculations: { [portfolioId: number]: SavedCalculation[] } = {};
  
  // Portfolio selection and comparison properties
  selectedPortfolioId: number | null = null;
  comparisonPortfolioId: number | null = null;
  showComparison = false;
  showOrganizeView = false;
  portfolioSummaries: { [portfolioId: number]: any } = {};
  
  comparisonMetrics = [
    { key: 'totalProperties', label: 'Total Properties', format: 'number' },
    { key: 'totalCashInvested', label: 'Total Cash Invested', format: 'currency' },
    { key: 'monthlyCashFlow', label: 'Monthly Cash Flow', format: 'currency' },
    { key: 'annualCashFlow', label: 'Annual Cash Flow', format: 'currency' },
    { key: 'monthlyEquityGain', label: 'Monthly Equity Gain', format: 'currency' },
    { key: 'monthlyTotalReturn', label: 'Monthly Total Return', format: 'currency' },
    { key: 'yearlyTotalReturn', label: 'Yearly Total Return', format: 'currency' },
    { key: 'cashOnCashReturn', label: 'Cash-on-Cash Return', format: 'percentage' },
    { key: 'taxableIncome', label: 'Annual Taxable Income', format: 'currency' },
    { key: 'annualDepreciation', label: 'Annual Depreciation', format: 'currency' }
  ];

  private dbService = inject(IndexedDbService);
  private calculatorDataService = inject(CalculatorDataService);
  private calculatorService = inject(RealEstateCalculatorService);
  private portfolioService = inject(PortfolioService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.loadPortfoliosAndCalculations();
    
    // Handle route parameters for portfolio selection
    this.route.paramMap.subscribe(params => {
      const portfolioId = params.get('id');
      if (portfolioId) {
        const parsedId = parseInt(portfolioId, 10);
        
        // Check if portfolios are loaded and the portfolio exists
        if (this.portfolios.length > 0) {
          const portfolioExists = this.portfolios.some(p => p.id === parsedId);
          if (portfolioExists) {
            this.selectedPortfolioId = parsedId;
            this.showOrganizeView = false;
            this.showComparison = false;
            this.comparisonPortfolioId = null;
          } else {
            this.router.navigate(['/portfolios']);
          }
        } else {
          // Portfolios not loaded yet, store the ID for later
          this.selectedPortfolioId = parsedId;
        }
      } else {
        // No portfolio ID in URL, reset to portfolio view
        this.selectedPortfolioId = null;
        this.showOrganizeView = false;
      }
    });
  }

  private loadPortfoliosAndCalculations(): void {
    // Load portfolios first
    this.portfolioService.getAllPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios = portfolios;
        
        // Check if we have a pending portfolio selection from URL
        if (this.selectedPortfolioId !== null) {
          const portfolioExists = portfolios.some(p => p.id === this.selectedPortfolioId);
          if (!portfolioExists) {
            this.selectedPortfolioId = null;
            this.router.navigate(['/portfolios']);
          }
        }
        
        // Ensure default portfolio exists
        if (portfolios.length === 0) {
          this.portfolioService.createNewPortfolio('My Portfolio', 'Default investment portfolio').subscribe({
            next: (defaultPortfolio) => {
              this.portfolios = [defaultPortfolio];
              this.loadCalculationsForPortfolios();
            }
          });
        } else {
          this.loadCalculationsForPortfolios();
        }
      },
      error: (error) => {
        console.error('Error loading portfolios:', error);
      }
    });
  }

  private loadCalculationsForPortfolios(): void {
    this.dbService.getAllCalculations().subscribe({
      next: (calculations) => {
        console.log('Loaded calculations:', calculations);
        // Organize calculations by portfolio
        this.portfolioCalculations = {};
        
        // Initialize empty arrays for each portfolio
        this.portfolios.forEach(portfolio => {
          this.portfolioCalculations[portfolio.id || 1] = [];
        });
        
        // Sort calculations into portfolios
        calculations
          .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))
          .forEach(calc => {
            const portfolioId = calc.scenarioId || 1;
            if (!this.portfolioCalculations[portfolioId]) {
              this.portfolioCalculations[portfolioId] = [];
            }
            this.portfolioCalculations[portfolioId].push(calc);
          });
        
        console.log('Organized calculations by portfolio:', this.portfolioCalculations);
        
        // Calculate portfolio summaries for comparison
        this.calculatePortfolioSummaries();
        
        // If we have a selected portfolio from URL, make sure it's valid
        if (this.selectedPortfolioId) {
          const portfolioExists = this.portfolios.some(p => p.id === this.selectedPortfolioId);
          if (!portfolioExists) {
            // Portfolio doesn't exist, redirect to portfolio home
            this.router.navigate(['/portfolios']);
          }
        }
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

  onDrop(event: CdkDragDrop<SavedCalculation[]>, targetPortfolioId: number): void {
    console.log('Drop event:', {
      previousContainer: event.previousContainer.id,
      currentContainer: event.container.id,
      targetPortfolioId,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      sameContainer: event.previousContainer === event.container
    });

    if (event.previousContainer === event.container) {
      // Reordering within the same portfolio
      console.log('Reordering within same portfolio');
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Moving between portfolios
      console.log('Moving between portfolios');
      const calculation = event.previousContainer.data[event.previousIndex];
      console.log('Moving calculation:', calculation.name, 'to portfolio:', targetPortfolioId);
      
      // Update the calculation's portfolio
      const updatedCalculation: SavedCalculation = {
        ...calculation,
        portfolioId: targetPortfolioId,
        scenarioId: targetPortfolioId, // For backward compatibility
        updatedAt: new Date()
      };

      this.dbService.saveCalculation(updatedCalculation).subscribe({
        next: () => {
          console.log('Successfully saved calculation with new portfolio');
          // Move the item between containers
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
          
          this.snackBar.open(`Moved "${calculation.name}" to ${this.getPortfolioName(targetPortfolioId)}`, 'Close', {
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

  getAllCalculations(): SavedCalculation[] {
    const allCalculations: SavedCalculation[] = [];
    Object.values(this.portfolioCalculations).forEach(calculations => {
      allCalculations.push(...calculations);
    });
    return allCalculations;
  }

  getDropListIds(): string[] {
    const allIds = this.portfolios.map(portfolio => `portfolio-${portfolio.id}`);
    console.log('All drop list IDs:', allIds);
    return allIds;
  }

  getConnectedDropLists(currentPortfolioId: number): string[] {
    // Return all portfolio IDs except the current one to allow cross-portfolio drops
    const connectedIds = this.portfolios
      .filter(portfolio => portfolio.id !== currentPortfolioId)
      .map(portfolio => `portfolio-${portfolio.id}`);
    console.log(`Connected drop lists for portfolio ${currentPortfolioId}:`, connectedIds);
    return connectedIds;
  }

  // Navigation methods
  selectPortfolio(portfolioId: number): void {
    this.router.navigate(['/portfolio', portfolioId]);
  }

  goBackToPortfolios(): void {
    this.router.navigate(['/portfolios']);
  }

  toggleOrganizeView(): void {
    // Simple state toggle without navigation
    this.showOrganizeView = !this.showOrganizeView;
    if (this.showOrganizeView) {
      // Clear other views when entering organize mode
      this.selectedPortfolioId = null;
      this.showComparison = false;
      this.comparisonPortfolioId = null;
    }
  }

  renamePortfolio(portfolio: Portfolio): void {
    const newName = prompt('Enter new portfolio name:', portfolio.name);
    if (newName && newName.trim() && newName.trim() !== portfolio.name) {
      const trimmedName = newName.trim();
      
      // Check if name already exists
      const nameExists = this.portfolios.some(p => 
        p.id !== portfolio.id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      if (nameExists) {
        this.snackBar.open('A portfolio with this name already exists', 'Close', {
          duration: 3000
        });
        return;
      }

      const updatedPortfolio: Portfolio = {
        ...portfolio,
        name: trimmedName,
        updatedAt: new Date()
      };

      this.portfolioService.savePortfolio(updatedPortfolio).subscribe({
        next: () => {
          const index = this.portfolios.findIndex(p => p.id === portfolio.id);
          if (index !== -1) {
            this.portfolios[index] = updatedPortfolio;
          }
          this.snackBar.open(`Portfolio renamed to "${trimmedName}"`, 'Close', {
            duration: 3000
          });
        },
        error: (error: any) => {
          console.error('Error renaming portfolio:', error);
          this.snackBar.open('Error renaming portfolio', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  deletePortfolio(portfolio: Portfolio): void {
    if (this.portfolios.length <= 1) {
      this.snackBar.open('Cannot delete the last portfolio', 'Close', {
        duration: 3000
      });
      return;
    }

    const calculationsCount = this.getCalculationsForPortfolio(portfolio.id!).length;
    let confirmMessage = `Are you sure you want to delete portfolio "${portfolio.name}"?`;
    
    if (calculationsCount > 0) {
      confirmMessage += ` This will move ${calculationsCount} calculation(s) to the first portfolio.`;
    }

    if (confirm(confirmMessage)) {
      const firstPortfolio = this.portfolios.find(p => p.id !== portfolio.id);
      const calculationsToMove = this.getCalculationsForPortfolio(portfolio.id!);

      // Move calculations to the first remaining portfolio
      if (calculationsToMove.length > 0 && firstPortfolio) {
        const updatePromises = calculationsToMove.map(calc => {
          const updatedCalc: SavedCalculation = {
            ...calc,
            scenarioId: firstPortfolio.id!,
            updatedAt: new Date()
          };
          return this.dbService.saveCalculation(updatedCalc).toPromise();
        });

        Promise.all(updatePromises).then(() => {
          this.deletePortfolioFromDb(portfolio);
        }).catch(error => {
          console.error('Error moving calculations:', error);
          this.snackBar.open('Error moving calculations to another portfolio', 'Close', {
            duration: 3000
          });
        });
      } else {
        this.deletePortfolioFromDb(portfolio);
      }
    }
  }

  private deletePortfolioFromDb(portfolio: Portfolio): void {
    this.portfolioService.deletePortfolio(portfolio.id!).subscribe({
      next: () => {
        this.portfolios = this.portfolios.filter(p => p.id !== portfolio.id);
        delete this.portfolioCalculations[portfolio.id!];
        this.loadCalculationsForPortfolios();
        this.snackBar.open(`Portfolio "${portfolio.name}" deleted successfully!`, 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Error deleting portfolio:', error);
        this.snackBar.open('Error deleting portfolio', 'Close', {
          duration: 3000
        });
      }
    });
  }

  // Essential portfolio methods
  getPortfolioName(portfolioId: number): string {
    const portfolio = this.portfolios.find(p => p.id === portfolioId);
    return portfolio ? portfolio.name : 'Unknown Portfolio';
  }

  getCalculationsForPortfolio(portfolioId: number): SavedCalculation[] {
    return this.portfolioCalculations[portfolioId] || [];
  }

  getPortfolioById(portfolioId: number): Portfolio | undefined {
    return this.portfolios.find(p => p.id === portfolioId);
  }

  getPortfolioMetricValue(portfolioId: number, metricKey: string): number {
    return this.portfolioSummaries[portfolioId]?.[metricKey] || 0;
  }

  createNewPortfolio(): void {
    const name = prompt('Enter portfolio name:');
    if (name && name.trim()) {
      const description = prompt('Enter portfolio description (optional):') || '';
      
      this.portfolioService.createNewPortfolio(name.trim(), description.trim()).subscribe({
        next: (newPortfolio) => {
          this.portfolios.push(newPortfolio);
          this.portfolioCalculations[newPortfolio.id!] = [];
          this.snackBar.open(`Portfolio "${newPortfolio.name}" created successfully!`, 'Close', {
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

  toggleComparison(): void {
    if (this.comparisonPortfolioId) {
      // If comparison is active, clear it
      this.comparisonPortfolioId = null;
    } else {
      // If no comparison is active, select the first available portfolio
      const availablePortfolios = this.portfolios.filter(p => p.id !== this.selectedPortfolioId);
      if (availablePortfolios.length > 0) {
        this.comparisonPortfolioId = availablePortfolios[0].id!;
      }
    }
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

  private calculatePortfolioSummaries(): void {
    this.portfolioSummaries = {};
    
    this.portfolios.forEach(portfolio => {
      const calculations = this.getCalculationsForPortfolio(portfolio.id!);
      const validCalculations = calculations.filter(calc => calc.results);
      
      if (validCalculations.length === 0) {
        this.portfolioSummaries[portfolio.id!] = {
          totalProperties: 0,
          totalCashInvested: 0,
          monthlyCashFlow: 0,
          annualCashFlow: 0,
          monthlyEquityGain: 0,
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
          monthlyEquityGain: acc.monthlyEquityGain + (results.monthlyEquityGain || 0),
          monthlyTotalReturn: acc.monthlyTotalReturn + (results.monthlyTotalReturn || 0),
          yearlyTotalReturn: acc.yearlyTotalReturn + (results.yearlyTotalReturn || 0),
          taxableIncome: acc.taxableIncome + (results.taxableIncome || 0),
          annualDepreciation: acc.annualDepreciation + (results.annualDepreciation || 0)
        };
      }, {
        totalCashInvested: 0,
        monthlyCashFlow: 0,
        annualCashFlow: 0,
        monthlyEquityGain: 0,
        monthlyTotalReturn: 0,
        yearlyTotalReturn: 0,
        taxableIncome: 0,
        annualDepreciation: 0
      });

      const cashOnCashReturn = summary.totalCashInvested > 0 
        ? (summary.annualCashFlow / summary.totalCashInvested) * 100 
        : 0;

      this.portfolioSummaries[portfolio.id!] = {
        totalProperties: validCalculations.length,
        ...summary,
        cashOnCashReturn
      };
    });
  }

  // Missing methods for calculations
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
          this.loadCalculationsForPortfolios();
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
          this.loadPortfoliosAndCalculations();
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

  getMetricDifference(portfolio1Id: number, portfolio2Id: number, metricKey: string): number {
    const value1 = this.getPortfolioMetricValue(portfolio1Id, metricKey);
    const value2 = this.getPortfolioMetricValue(portfolio2Id, metricKey);
    return value1 - value2;
  }

  formatDifference(difference: number, format: string): string {
    const prefix = difference > 0 ? '+' : '';
    
    switch (format) {
      case 'currency':
        return `${prefix}${new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(difference)}`;
      case 'percentage':
        return `${prefix}${difference.toFixed(2)}%`;
      case 'number':
        return `${prefix}${difference}`;
      default:
        return `${prefix}${difference}`;
    }
  }

  getOrganizeDropListIds(): string[] {
    return this.portfolios.map(portfolio => `organize-portfolio-${portfolio.id}`);
  }
}
