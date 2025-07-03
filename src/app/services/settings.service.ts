import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Settings, DEFAULT_SETTINGS } from '../models/settings.interface';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'calculator-settings';
  private settingsSubject = new BehaviorSubject<Settings>(DEFAULT_SETTINGS);

  constructor() {
    this.loadSettings();
  }

  /**
   * Get current settings as observable
   */
  getSettings(): Observable<Settings> {
    return this.settingsSubject.asObservable();
  }

  /**
   * Get current settings value synchronously
   */
  getCurrentSettings(): Settings {
    return this.settingsSubject.value;
  }

  /**
   * Save settings to localStorage and update subject
   */
  saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      this.settingsSubject.next(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): void {
    this.saveSettings(DEFAULT_SETTINGS);
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        // Validate that all required properties exist
        const validatedSettings = this.validateSettings(settings);
        this.settingsSubject.next(validatedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fall back to defaults if loading fails
      this.settingsSubject.next(DEFAULT_SETTINGS);
    }
  }

  /**
   * Validate settings object and fill in missing properties with defaults
   */
  private validateSettings(settings: any): Settings {
    return {
      interestRate: settings.interestRate ?? DEFAULT_SETTINGS.interestRate,
      downPaymentPercentage: settings.downPaymentPercentage ?? DEFAULT_SETTINGS.downPaymentPercentage,
      termInYears: settings.termInYears ?? DEFAULT_SETTINGS.termInYears,
      paymentsPerYear: settings.paymentsPerYear ?? DEFAULT_SETTINGS.paymentsPerYear,
      operatingExpensesPercentage: settings.operatingExpensesPercentage ?? DEFAULT_SETTINGS.operatingExpensesPercentage,
      capitalExpendituresPercentage: settings.capitalExpendituresPercentage ?? DEFAULT_SETTINGS.capitalExpendituresPercentage,
      mortgageInsuranceRatePercentage: settings.mortgageInsuranceRatePercentage ?? DEFAULT_SETTINGS.mortgageInsuranceRatePercentage,
      appreciationPercentage: settings.appreciationPercentage ?? DEFAULT_SETTINGS.appreciationPercentage
    };
  }
}
