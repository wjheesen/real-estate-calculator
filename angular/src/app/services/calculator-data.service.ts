import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SavedCalculation } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class CalculatorDataService {
  private loadedCalculationSubject = new BehaviorSubject<SavedCalculation | null>(null);
  
  constructor() {}

  // Observable for components to subscribe to
  get loadedCalculation$(): Observable<SavedCalculation | null> {
    return this.loadedCalculationSubject.asObservable();
  }

  // Method to load a calculation
  loadCalculation(calculation: SavedCalculation): void {
    this.loadedCalculationSubject.next(calculation);
  }

  // Method to clear the loaded calculation
  clearLoadedCalculation(): void {
    this.loadedCalculationSubject.next(null);
  }

  // Get the current loaded calculation value
  getCurrentLoadedCalculation(): SavedCalculation | null {
    return this.loadedCalculationSubject.value;
  }
}
