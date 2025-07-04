import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { SavedCalculation, Portfolio } from '../models/real-estate.interface';
import { BudgetData } from '../models/budget.interface';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'RealEstateCalculatorDB';
  private version = 4; // Updated version for budget data
  private calculationsStoreName = 'calculations';
  private portfoliosStoreName = 'portfolios';
  private budgetStoreName = 'budget';

  constructor() {}

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create calculations store
        if (!db.objectStoreNames.contains(this.calculationsStoreName)) {
          const calculationsStore = db.createObjectStore(this.calculationsStoreName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          calculationsStore.createIndex('name', 'name', { unique: false });
          calculationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          calculationsStore.createIndex('scenarioId', 'scenarioId', { unique: false });
        }
        
        // Create scenarios store
        if (!db.objectStoreNames.contains(this.portfoliosStoreName)) {
          const portfoliosStore = db.createObjectStore(this.portfoliosStoreName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          portfoliosStore.createIndex('name', 'name', { unique: false });
          portfoliosStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Create budget store
        if (!db.objectStoreNames.contains(this.budgetStoreName)) {
          const budgetStore = db.createObjectStore(this.budgetStoreName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          budgetStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Initialize default scenario if this is a fresh install
        if (event.oldVersion === 0) {
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const portfoliosStore = transaction.objectStore(this.portfoliosStoreName);
          const defaultPortfolio = {
            id: 1,
            name: 'My Portfolio',
            description: 'Default portfolio',
            color: '#1976d2',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          portfoliosStore.add(defaultPortfolio);
        }
      };
    });
  }

  saveCalculation(calculation: SavedCalculation): Observable<SavedCalculation> {
    return from(this.performSave(calculation));
  }

  private async performSave(calculation: SavedCalculation): Promise<SavedCalculation> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readwrite');
    const store = transaction.objectStore(this.calculationsStoreName);
    
    const now = new Date();
    const calculationToSave = {
      ...calculation,
      updatedAt: now,
      createdAt: calculation.createdAt || now,
      scenarioId: calculation.portfolioId || calculation.scenarioId || 1 // Support both new portfolioId and legacy scenarioId
    };

    return new Promise((resolve, reject) => {
      const request = store.put(calculationToSave);
      
      request.onsuccess = () => {
        const savedCalculation = { ...calculationToSave, id: request.result as number };
        resolve(savedCalculation);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  getAllCalculations(): Observable<SavedCalculation[]> {
    return from(this.performGetAll());
  }

  private async performGetAll(): Promise<SavedCalculation[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readonly');
    const store = transaction.objectStore(this.calculationsStoreName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getCalculation(id: number): Observable<SavedCalculation | undefined> {
    return from(this.performGet(id));
  }

  private async performGet(id: number): Promise<SavedCalculation | undefined> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readonly');
    const store = transaction.objectStore(this.calculationsStoreName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  deleteCalculation(id: number): Observable<boolean> {
    return from(this.performDelete(id));
  }

  private async performDelete(id: number): Promise<boolean> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readwrite');
    const store = transaction.objectStore(this.calculationsStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  updateCalculation(calculation: SavedCalculation): Observable<SavedCalculation> {
    if (!calculation.id) {
      return throwError(() => new Error('Cannot update calculation without ID'));
    }
    return this.saveCalculation(calculation);
  }

  // Portfolio management methods
  savePortfolio(portfolio: Portfolio): Observable<Portfolio> {
    return from(this.performSavePortfolio(portfolio));
  }

  private async performSavePortfolio(portfolio: Portfolio): Promise<Portfolio> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.portfoliosStoreName], 'readwrite');
    const store = transaction.objectStore(this.portfoliosStoreName);
    
    const now = new Date();
    const portfolioToSave = {
      ...portfolio,
      updatedAt: now,
      createdAt: portfolio.createdAt || now
    };

    return new Promise((resolve, reject) => {
      const request = portfolio.id 
        ? store.put(portfolioToSave)
        : store.add(portfolioToSave);
      
      request.onsuccess = () => {
        const result = { ...portfolioToSave };
        if (!portfolio.id) {
          result.id = request.result as number;
        }
        resolve(result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  getAllPortfolios(): Observable<Portfolio[]> {
    return from(this.performGetAllPortfolios());
  }

  private async performGetAllPortfolios(): Promise<Portfolio[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.portfoliosStoreName], 'readonly');
    const store = transaction.objectStore(this.portfoliosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  getPortfolio(id: number): Observable<Portfolio | null> {
    return from(this.performGetPortfolio(id));
  }

  private async performGetPortfolio(id: number): Promise<Portfolio | null> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.portfoliosStoreName], 'readonly');
    const store = transaction.objectStore(this.portfoliosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  deletePortfolio(id: number): Observable<void> {
    return from(this.performDeletePortfolio(id));
  }

  private async performDeletePortfolio(id: number): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.portfoliosStoreName], 'readwrite');
    const store = transaction.objectStore(this.portfoliosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getCalculationsByPortfolio(portfolioId: number): Observable<SavedCalculation[]> {
    return from(this.performGetCalculationsByPortfolio(portfolioId));
  }

  private async performGetCalculationsByPortfolio(portfolioId: number): Promise<SavedCalculation[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readonly');
    const store = transaction.objectStore(this.calculationsStoreName);
    const index = store.index('scenarioId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(portfolioId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Budget methods
  saveBudget(budget: BudgetData): Observable<BudgetData> {
    return from(this.performSaveBudget(budget));
  }

  private async performSaveBudget(budget: BudgetData): Promise<BudgetData> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.budgetStoreName], 'readwrite');
    const store = transaction.objectStore(this.budgetStoreName);

    const budgetToSave = {
      ...budget,
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const request = budget.id ? store.put(budgetToSave) : store.add(budgetToSave);
      request.onsuccess = () => {
        const savedBudget = { ...budgetToSave, id: request.result as number };
        resolve(savedBudget);
      };
      request.onerror = () => reject(request.error);
    });
  }

  getBudget(): Observable<BudgetData | null> {
    return from(this.performGetBudget());
  }

  private async performGetBudget(): Promise<BudgetData | null> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.budgetStoreName], 'readonly');
    const store = transaction.objectStore(this.budgetStoreName);

    return new Promise((resolve, reject) => {
      // Get the most recent budget (we'll only store one budget record)
      const request = store.getAll();
      request.onsuccess = () => {
        const budgets = request.result || [];
        if (budgets.length > 0) {
          // Return the most recent budget
          const sortedBudgets = budgets.sort((a, b) => 
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
          );
          resolve(sortedBudgets[0]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  deleteBudget(id: number): Observable<void> {
    return from(this.performDeleteBudget(id));
  }

  private async performDeleteBudget(id: number): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.budgetStoreName], 'readwrite');
    const store = transaction.objectStore(this.budgetStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  clearAllBudgets(): Observable<void> {
    return from(this.performClearAllBudgets());
  }

  private async performClearAllBudgets(): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.budgetStoreName], 'readwrite');
    const store = transaction.objectStore(this.budgetStoreName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
