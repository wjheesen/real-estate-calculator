import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { IndexedDbService } from './indexed-db.service';
import { RealEstateCalculatorService } from './real-estate-calculator.service';
import { Portfolio, SavedCalculation, PortfolioSummary } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private dbService = inject(IndexedDbService);
  private calculatorService = inject(RealEstateCalculatorService);

  constructor() {}

  // Portfolio CRUD operations
  getAllPortfolios(): Observable<Portfolio[]> {
    return this.dbService.getAllPortfolios();
  }

  getPortfolio(id: number): Observable<Portfolio | null> {
    return this.dbService.getPortfolio(id);
  }

  savePortfolio(portfolio: Portfolio): Observable<Portfolio> {
    return this.dbService.savePortfolio(portfolio);
  }

  deletePortfolio(id: number): Observable<void> {
    // Note: We should add validation to prevent deleting the default portfolio
    // and handle what happens to calculations in deleted portfolios
    return this.dbService.deletePortfolio(id);
  }

  createNewPortfolio(name: string, description?: string): Observable<Portfolio> {
    const newPortfolio: Portfolio = {
      name,
      description,
      color: this.getRandomColor(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.savePortfolio(newPortfolio);
  }

  duplicatePortfolio(sourcePortfolioId: number, newName: string): Observable<Portfolio> {
    // For now, just create a new portfolio - full duplication logic can be added later
    const newPortfolio: Portfolio = {
      name: newName,
      description: `Copy of portfolio`,
      color: this.getRandomColor(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.savePortfolio(newPortfolio);
  }

  // Portfolio summary calculations
  getPortfolioSummary(portfolioId: number): Observable<PortfolioSummary> {
    return combineLatest([
      this.dbService.getPortfolio(portfolioId),
      this.dbService.getCalculationsByPortfolio(portfolioId)
    ]).pipe(
      map(([portfolio, calculations]) => {
        if (!portfolio) {
          throw new Error('Portfolio not found');
        }
        return this.calculatePortfolioSummary(portfolio, calculations);
      })
    );
  }

  getAllPortfolioSummaries(): Observable<PortfolioSummary[]> {
    return combineLatest([
      this.dbService.getAllPortfolios(),
      this.dbService.getAllCalculations()
    ]).pipe(
      map(([portfolios, allCalculations]) => {
        return portfolios.map(portfolio => {
          const portfolioCalculations = allCalculations.filter(calc => 
            (calc.portfolioId || calc.scenarioId || 1) === portfolio.id
          );
          return this.calculatePortfolioSummary(portfolio, portfolioCalculations);
        });
      })
    );
  }

  private calculatePortfolioSummary(portfolio: Portfolio, calculations: SavedCalculation[]): PortfolioSummary {
    const validCalculations = calculations.filter(calc => calc.results);
    
    if (validCalculations.length === 0) {
      return {
        portfolio: portfolio,
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

    // Calculate portfolio cash-on-cash return
    const cashOnCashReturn = summary.totalCashInvested > 0 
      ? (summary.annualCashFlow / summary.totalCashInvested) * 100 
      : 0;

    return {
      portfolio: portfolio,
      totalProperties: validCalculations.length,
      ...summary,
      cashOnCashReturn
    };
  }

  private getRandomColor(): string {
    const colors = [
      '#1976d2', // Blue
      '#388e3c', // Green
      '#f57c00', // Orange
      '#7b1fa2', // Purple
      '#c2185b', // Pink
      '#00796b', // Teal
      '#5d4037', // Brown
      '#616161'  // Grey
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
