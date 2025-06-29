import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { SavedCalculation } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'RealEstateCalculatorDB';
  private version = 1;
  private storeName = 'calculations';

  constructor() {}

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  saveCalculation(calculation: SavedCalculation): Observable<SavedCalculation> {
    return from(this.performSave(calculation));
  }

  private async performSave(calculation: SavedCalculation): Promise<SavedCalculation> {
    const db = await this.openDatabase();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const now = new Date();
    const calculationToSave = {
      ...calculation,
      updatedAt: now,
      createdAt: calculation.createdAt || now
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
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

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
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

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
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

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
}
