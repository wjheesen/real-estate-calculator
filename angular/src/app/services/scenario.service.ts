import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { IndexedDbService } from './indexed-db.service';
import { RealEstateCalculatorService } from './real-estate-calculator.service';
import { Scenario, SavedCalculation, ScenarioSummary } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class ScenarioService {
  private dbService = inject(IndexedDbService);
  private calculatorService = inject(RealEstateCalculatorService);

  constructor() {}

  // Scenario CRUD operations
  getAllScenarios(): Observable<Scenario[]> {
    return this.dbService.getAllScenarios();
  }

  getScenario(id: number): Observable<Scenario | null> {
    return this.dbService.getScenario(id);
  }

  saveScenario(scenario: Scenario): Observable<Scenario> {
    return this.dbService.saveScenario(scenario);
  }

  deleteScenario(id: number): Observable<void> {
    // Note: We should add validation to prevent deleting the default scenario
    // and handle what happens to calculations in deleted scenarios
    return this.dbService.deleteScenario(id);
  }

  createNewScenario(name: string, description?: string): Observable<Scenario> {
    const newScenario: Scenario = {
      name,
      description,
      color: this.getRandomColor(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.saveScenario(newScenario);
  }

  duplicateScenario(sourceScenarioId: number, newName: string): Observable<Scenario> {
    // For now, just create a new scenario - full duplication logic can be added later
    const newScenario: Scenario = {
      name: newName,
      description: `Copy of scenario`,
      color: this.getRandomColor(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return this.saveScenario(newScenario);
  }

  // Scenario summary calculations
  getScenarioSummary(scenarioId: number): Observable<ScenarioSummary> {
    return combineLatest([
      this.dbService.getScenario(scenarioId),
      this.dbService.getCalculationsByScenario(scenarioId)
    ]).pipe(
      map(([scenario, calculations]) => {
        if (!scenario) {
          throw new Error('Scenario not found');
        }
        return this.calculateScenarioSummary(scenario, calculations);
      })
    );
  }

  getAllScenarioSummaries(): Observable<ScenarioSummary[]> {
    return combineLatest([
      this.dbService.getAllScenarios(),
      this.dbService.getAllCalculations()
    ]).pipe(
      map(([scenarios, allCalculations]) => {
        return scenarios.map(scenario => {
          const scenarioCalculations = allCalculations.filter(calc => 
            (calc.scenarioId || 1) === scenario.id
          );
          return this.calculateScenarioSummary(scenario, scenarioCalculations);
        });
      })
    );
  }

  private calculateScenarioSummary(scenario: Scenario, calculations: SavedCalculation[]): ScenarioSummary {
    const validCalculations = calculations.filter(calc => calc.results);
    
    if (validCalculations.length === 0) {
      return {
        scenario,
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
      scenario,
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
