import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { SavedCalculation, Scenario } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'RealEstateCalculatorDB';
  private version = 2; // Updated version for scenarios
  private calculationsStoreName = 'calculations';
  private scenariosStoreName = 'scenarios';

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
        if (!db.objectStoreNames.contains(this.scenariosStoreName)) {
          const scenariosStore = db.createObjectStore(this.scenariosStoreName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          scenariosStore.createIndex('name', 'name', { unique: false });
          scenariosStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Initialize default scenario if this is a fresh install
        if (event.oldVersion === 0) {
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const scenariosStore = transaction.objectStore(this.scenariosStoreName);
          const defaultScenario = {
            id: 1,
            name: 'My Portfolio',
            description: 'Default portfolio scenario',
            color: '#1976d2',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          scenariosStore.add(defaultScenario);
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
      scenarioId: calculation.scenarioId || 1 // Default to "My Portfolio" scenario
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

  // Scenario management methods
  saveScenario(scenario: Scenario): Observable<Scenario> {
    return from(this.performSaveScenario(scenario));
  }

  private async performSaveScenario(scenario: Scenario): Promise<Scenario> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.scenariosStoreName], 'readwrite');
    const store = transaction.objectStore(this.scenariosStoreName);
    
    const now = new Date();
    const scenarioToSave = {
      ...scenario,
      updatedAt: now,
      createdAt: scenario.createdAt || now
    };

    return new Promise((resolve, reject) => {
      const request = scenario.id 
        ? store.put(scenarioToSave)
        : store.add(scenarioToSave);
      
      request.onsuccess = () => {
        const result = { ...scenarioToSave };
        if (!scenario.id) {
          result.id = request.result as number;
        }
        resolve(result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  getAllScenarios(): Observable<Scenario[]> {
    return from(this.performGetAllScenarios());
  }

  private async performGetAllScenarios(): Promise<Scenario[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.scenariosStoreName], 'readonly');
    const store = transaction.objectStore(this.scenariosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  getScenario(id: number): Observable<Scenario | null> {
    return from(this.performGetScenario(id));
  }

  private async performGetScenario(id: number): Promise<Scenario | null> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.scenariosStoreName], 'readonly');
    const store = transaction.objectStore(this.scenariosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  deleteScenario(id: number): Observable<void> {
    return from(this.performDeleteScenario(id));
  }

  private async performDeleteScenario(id: number): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.scenariosStoreName], 'readwrite');
    const store = transaction.objectStore(this.scenariosStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getCalculationsByScenario(scenarioId: number): Observable<SavedCalculation[]> {
    return from(this.performGetCalculationsByScenario(scenarioId));
  }

  private async performGetCalculationsByScenario(scenarioId: number): Promise<SavedCalculation[]> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.calculationsStoreName], 'readonly');
    const store = transaction.objectStore(this.calculationsStoreName);
    const index = store.index('scenarioId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(scenarioId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
}
