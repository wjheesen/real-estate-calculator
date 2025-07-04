import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { IndexedDbService } from './indexed-db.service';
import { SettingsService } from './settings.service';
import { Portfolio, SavedCalculation } from '../models/real-estate.interface';
import { Settings } from '../models/settings.interface';
import { BudgetData } from '../models/budget.interface';
import JSZip from 'jszip';

export interface ExportData {
  portfolios: Portfolio[];
  calculations: SavedCalculation[];
  budget: BudgetData | null;
  settings: Settings;
  exportDate: string;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataExportService {
  private dbService = inject(IndexedDbService);
  private settingsService = inject(SettingsService);

  constructor() {}

  /**
   * Check if file download/upload is available (always true for modern browsers)
   */
  isFileOperationAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof document !== 'undefined' &&
           'createElement' in document &&
           'click' in HTMLElement.prototype;
  }

  /**
   * Export all portfolio data as a ZIP file containing CSV files
   */
  exportData(): Observable<void> {
    if (!this.isFileOperationAvailable()) {
      return throwError(() => new Error('File download is not available'));
    }

    return new Observable(observer => {
      // Get all data from IndexedDB and settings
      Promise.all([
        this.dbService.getAllPortfolios().toPromise(),
        this.dbService.getAllCalculations().toPromise(),
        this.dbService.getBudget().toPromise(),
        Promise.resolve(this.settingsService.getCurrentSettings())
      ]).then(([portfolios, calculations, budget, settings]) => {
        try {
          // Create CSV content for portfolios
          const portfoliosCsvContent = this.convertPortfoliosToCSV(portfolios || []);
          
          // Create CSV content for calculations
          const calculationsCsvContent = this.convertCalculationsToCSV(calculations || []);
          
          // Create CSV content for budget
          const budgetCsvContent = this.convertBudgetToCSV(budget || null);
          
          // Create CSV content for settings
          const settingsCsvContent = this.convertSettingsToCSV(settings);
          
          // Create ZIP file
          const zip = new JSZip();
          zip.file('portfolios.csv', portfoliosCsvContent);
          zip.file('calculations.csv', calculationsCsvContent);
          zip.file('budget.csv', budgetCsvContent);
          zip.file('settings.csv', settingsCsvContent);
          
          // Add a README file with export information
          const exportDate = new Date().toISOString();
          const readmeContent = `Real Estate Calculator Data Export
======================================

Export Date: ${exportDate}
Files Included:
- portfolios.csv: Portfolio information
- calculations.csv: Property calculation data
- budget.csv: Budget and expense data
- settings.csv: Application settings and defaults

To import this data:
1. Go to the Portfolio page in the Real Estate Calculator
2. Click the Import button
3. Select this entire ZIP file

Note: Importing will replace all existing data and settings.
`;
          zip.file('README.txt', readmeContent);
          
          // Generate ZIP file and download
          zip.generateAsync({ type: 'blob' }).then((zipBlob: Blob) => {
            this.downloadFile(zipBlob, `real-estate-portfolio-${new Date().toISOString().split('T')[0]}.zip`);
            observer.next();
            observer.complete();
          }).catch((error: any) => {
            observer.error(new Error(`Failed to create ZIP file: ${error}`));
          });
          
        } catch (error) {
          observer.error(new Error(`Failed to export data: ${error}`));
        }
      }).catch(error => {
        observer.error(new Error(`Failed to retrieve data for export: ${error.message}`));
      });
    });
  }

  /**
   * Import portfolio data from ZIP file containing CSV files
   */
  importData(): Observable<void> {
    if (!this.isFileOperationAvailable()) {
      return throwError(() => new Error('File upload is not available'));
    }

    return new Observable(observer => {
      // Create file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.zip,.csv';
      fileInput.multiple = false;

      fileInput.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          if (file.name.endsWith('.zip')) {
            // Handle ZIP file
            this.processZipFile(file, observer);
          } else if (file.name.endsWith('.csv')) {
            // Handle individual CSV file (legacy support)
            this.processLegacyCSVFile(file, observer);
          } else {
            observer.error(new Error('Please select a ZIP file or CSV file'));
          }
        }
      };

      // Start file selection
      alert('Please select a ZIP file containing portfolio data (or a CSV file for legacy import)');
      fileInput.click();
    });
  }

  private processZipFile(file: File, observer: any): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      JSZip.loadAsync(e.target.result).then((zip) => {
        // Extract CSV files from ZIP
        const portfoliosFile = zip.file('portfolios.csv');
        const calculationsFile = zip.file('calculations.csv');
        const budgetFile = zip.file('budget.csv');
        const settingsFile = zip.file('settings.csv');

        if (!portfoliosFile || !calculationsFile) {
          observer.error(new Error('ZIP file must contain both portfolios.csv and calculations.csv'));
          return;
        }

        // Read CSV files (budget and settings are optional for backwards compatibility)
        const promises: Promise<string | null>[] = [
          portfoliosFile.async('text'),
          calculationsFile.async('text')
        ];

        if (budgetFile) {
          promises.push(budgetFile.async('text'));
        } else {
          promises.push(Promise.resolve(null)); // Add null as placeholder
        }

        if (settingsFile) {
          promises.push(settingsFile.async('text'));
        } else {
          promises.push(Promise.resolve(null)); // Add null as placeholder
        }

        Promise.all(promises).then((contents) => {
          try {
            const portfoliosData = this.parsePortfoliosCSV(contents[0]!);
            const calculationsData = this.parseCalculationsCSV(contents[1]!);
            const budgetData = contents[2] ? this.parseBudgetCSV(contents[2]) : null;
            const settingsData = contents[3] ? this.parseSettingsCSV(contents[3]) : null;
            
            // Import the data
            this.importDataToDatabase(portfoliosData, calculationsData, budgetData, settingsData, observer);
          } catch (error) {
            observer.error(new Error(`Failed to parse CSV files: ${error}`));
          }
        }).catch((error) => {
          observer.error(new Error(`Failed to read files from ZIP: ${error}`));
        });

      }).catch((error) => {
        observer.error(new Error(`Failed to process ZIP file: ${error}`));
      });
    };
    reader.readAsArrayBuffer(file);
  }

  private processLegacyCSVFile(file: File, observer: any): void {
    // Legacy support for single CSV file import
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        if (file.name.includes('portfolio')) {
          const portfoliosData = this.parsePortfoliosCSV(e.target.result);
          // For legacy support, we'll prompt for calculations file
          alert('Please now select the calculations.csv file');
          // This would need additional handling...
          observer.error(new Error('Legacy CSV import requires separate handling. Please use ZIP file format.'));
        } else {
          observer.error(new Error('Please use ZIP file format for complete import'));
        }
      } catch (error) {
        observer.error(new Error(`Failed to parse CSV file: ${error}`));
      }
    };
    reader.readAsText(file);
  }

  private async importDataToDatabase(portfoliosData: Portfolio[], calculationsData: SavedCalculation[], budgetData: BudgetData | null, settingsData: Settings | null, observer: any): Promise<void> {
    try {
      // Clear existing data first
      await this.clearLocalData();

      // Restore portfolios
      for (const portfolio of portfoliosData) {
        await this.dbService.savePortfolio(portfolio).toPromise();
      }

      // Restore calculations
      for (const calculation of calculationsData) {
        await this.dbService.saveCalculation(calculation).toPromise();
      }

      // Restore budget if provided
      if (budgetData) {
        await this.dbService.saveBudget(budgetData).toPromise();
      }

      // Restore settings if provided
      if (settingsData) {
        this.settingsService.saveSettings(settingsData);
      }

      observer.next();
      observer.complete();
    } catch (error) {
      observer.error(new Error(`Failed to import data: ${error}`));
    }
  }

  /**
   * Convert portfolios to CSV format
   */
  private convertPortfoliosToCSV(portfolios: Portfolio[]): string {
    const headers = ['id', 'name', 'description', 'color', 'createdAt', 'updatedAt'];
    const rows = portfolios.map(portfolio => [
      portfolio.id || '',
      `"${(portfolio.name || '').replace(/"/g, '""')}"`,
      `"${(portfolio.description || '').replace(/"/g, '""')}"`,
      portfolio.color || '',
      portfolio.createdAt ? new Date(portfolio.createdAt).toISOString() : '',
      portfolio.updatedAt ? new Date(portfolio.updatedAt).toISOString() : ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Convert calculations to CSV format
   */
  private convertCalculationsToCSV(calculations: SavedCalculation[]): string {
    const headers = [
      'id', 'name', 'description', 'purchasePrice', 'rehabCosts', 'closingCosts', 'downPayment',
      'usePercentageForDownPayment', 'interestRate', 'termYears', 'paymentsPerYear',
      'insuranceCost', 'mortgageInsurance', 'usePercentageForMortgageInsurance',
      'propertyTaxes', 'expectedRentalIncome', 'operatingExpenses', 'usePercentageForOpex',
      'capitalExpenditures', 'usePercentageForCapex', 'appreciationRate',
      'scheduleEDeductibleAmount', 'rentalUsePercentage', 'portfolioId', 'scenarioId',
      'createdAt', 'updatedAt'
    ];
    
    const rows = calculations.map(calc => [
      calc.id || '',
      `"${(calc.name || '').replace(/"/g, '""')}"`,
      `"${(calc.description || '').replace(/"/g, '""')}"`,
      calc.purchasePrice || '',
      calc.rehabCosts || '',
      calc.closingCosts || '',
      calc.downPayment || '',
      calc.usePercentageForDownPayment || false,
      calc.interestRate || '',
      calc.termYears || '',
      calc.paymentsPerYear || '',
      calc.insuranceCost || '',
      calc.mortgageInsurance || '',
      calc.usePercentageForMortgageInsurance || false,
      calc.propertyTaxes || '',
      calc.expectedRentalIncome || '',
      calc.operatingExpenses || '',
      calc.usePercentageForOpex || false,
      calc.capitalExpenditures || '',
      calc.usePercentageForCapex || false,
      calc.appreciationRate || '',
      calc.scheduleEDeductibleAmount || '',
      calc.rentalUsePercentage || '',
      calc.portfolioId || calc.scenarioId || '',
      calc.scenarioId || '',
      calc.createdAt ? new Date(calc.createdAt).toISOString() : '',
      calc.updatedAt ? new Date(calc.updatedAt).toISOString() : ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Download a file (CSV or ZIP)
   */
  private downloadFile(content: string | Blob, filename: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Parse portfolios CSV content
   */
  private parsePortfoliosCSV(content: string): Portfolio[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const portfolios: Portfolio[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length >= headers.length) {
        const portfolio: Portfolio = {
          id: values[0] ? parseInt(values[0]) : undefined,
          name: values[1] || '',
          description: values[2] || '',
          color: values[3] || '',
          createdAt: values[4] ? new Date(values[4]) : new Date(),
          updatedAt: values[5] ? new Date(values[5]) : new Date()
        };
        portfolios.push(portfolio);
      }
    }
    
    return portfolios;
  }

  /**
   * Parse calculations CSV content
   */
  private parseCalculationsCSV(content: string): SavedCalculation[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const calculations: SavedCalculation[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      if (values.length >= headers.length) {
        const calculation: SavedCalculation = {
          id: values[0] ? parseInt(values[0]) : undefined,
          name: values[1] || '',
          description: values[2] || '',
          purchasePrice: values[3] ? parseFloat(values[3]) : 0,
          rehabCosts: values[4] ? parseFloat(values[4]) : 0,
          closingCosts: values[5] ? parseFloat(values[5]) : 0,
          downPayment: values[6] ? parseFloat(values[6]) : 0,
          usePercentageForDownPayment: values[7] === 'true',
          interestRate: values[8] ? parseFloat(values[8]) : 0,
          termYears: values[9] ? parseInt(values[9]) : 0,
          paymentsPerYear: values[10] ? parseInt(values[10]) : 0,
          insuranceCost: values[11] ? parseFloat(values[11]) : 0,
          mortgageInsurance: values[12] ? parseFloat(values[12]) : 0,
          usePercentageForMortgageInsurance: values[13] === 'true',
          propertyTaxes: values[14] ? parseFloat(values[14]) : 0,
          expectedRentalIncome: values[15] ? parseFloat(values[15]) : 0,
          operatingExpenses: values[16] ? parseFloat(values[16]) : 0,
          usePercentageForOpex: values[17] === 'true',
          capitalExpenditures: values[18] ? parseFloat(values[18]) : 0,
          usePercentageForCapex: values[19] === 'true',
          appreciationRate: values[20] ? parseFloat(values[20]) : 0,
          scheduleEDeductibleAmount: values[21] ? parseFloat(values[21]) : 0,
          rentalUsePercentage: values[22] ? parseFloat(values[22]) : 0,
          portfolioId: values[23] ? parseInt(values[23]) : 1,
          scenarioId: values[24] ? parseInt(values[24]) : undefined,
          createdAt: values[25] ? new Date(values[25]) : new Date(),
          updatedAt: values[26] ? new Date(values[26]) : new Date()
        };
        calculations.push(calculation);
      }
    }
    
    return calculations;
  }

  /**
   * Convert settings to CSV format
   */
  private convertSettingsToCSV(settings: Settings): string {
    const headers = [
      'interestRate', 'downPaymentPercentage', 'termInYears', 'paymentsPerYear',
      'operatingExpensesPercentage', 'capitalExpendituresPercentage', 
      'mortgageInsuranceRatePercentage', 'appreciationPercentage'
    ];
    
    const values = [
      settings.interestRate,
      settings.downPaymentPercentage,
      settings.termInYears,
      settings.paymentsPerYear,
      settings.operatingExpensesPercentage,
      settings.capitalExpendituresPercentage,
      settings.mortgageInsuranceRatePercentage,
      settings.appreciationPercentage
    ];
    
    return [headers.join(','), values.join(',')].join('\n');
  }

  /**
   * Parse settings CSV content
   */
  private parseSettingsCSV(content: string): Settings {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const values = lines[1] ? lines[1].split(',') : [];
    
    // Create settings object with defaults as fallback
    const settings: Settings = {
      interestRate: values[0] ? parseFloat(values[0]) : 6.5,
      downPaymentPercentage: values[1] ? parseFloat(values[1]) : 20,
      termInYears: values[2] ? parseInt(values[2]) : 30,
      paymentsPerYear: values[3] ? parseInt(values[3]) : 12,
      operatingExpensesPercentage: values[4] ? parseFloat(values[4]) : 10,
      capitalExpendituresPercentage: values[5] ? parseFloat(values[5]) : 5,
      mortgageInsuranceRatePercentage: values[6] ? parseFloat(values[6]) : 0.5,
      appreciationPercentage: values[7] ? parseFloat(values[7]) : 3
    };
    
    return settings;
  }

  /**
   * Convert budget to CSV format
   */
  private convertBudgetToCSV(budget: BudgetData | null): string {
    if (!budget) {
      return 'No budget data';
    }

    // Budget basic info headers
    const basicHeaders = ['id', 'grossIncome', 'useTwoWeekPayStub', 'createdAt', 'updatedAt'];
    const basicRow = [
      budget.id || '',
      budget.grossIncome || 0,
      budget.useTwoWeekPayStub || false,
      budget.createdAt ? new Date(budget.createdAt).toISOString() : '',
      budget.updatedAt ? new Date(budget.updatedAt).toISOString() : ''
    ];

    let csvContent = basicHeaders.join(',') + '\n' + basicRow.join(',') + '\n\n';

    // Pay deductions section
    csvContent += 'PAY_DEDUCTIONS\n';
    csvContent += 'id,name,amount,description\n';
    if (budget.payDeductions && budget.payDeductions.length > 0) {
      budget.payDeductions.forEach(deduction => {
        csvContent += [
          deduction.id || '',
          `"${(deduction.name || '').replace(/"/g, '""')}"`,
          deduction.amount || 0,
          `"${(deduction.description || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
      });
    }

    // Annual expenses section
    csvContent += '\nANNUAL_EXPENSES\n';
    csvContent += 'id,name,amount,description\n';
    if (budget.annualExpenses && budget.annualExpenses.length > 0) {
      budget.annualExpenses.forEach(expense => {
        csvContent += [
          expense.id || '',
          `"${(expense.name || '').replace(/"/g, '""')}"`,
          expense.amount || 0,
          `"${(expense.description || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
      });
    }

    // Monthly expenses section
    csvContent += '\nMONTHLY_EXPENSES\n';
    csvContent += 'id,name,amount,description\n';
    if (budget.monthlyExpenses && budget.monthlyExpenses.length > 0) {
      budget.monthlyExpenses.forEach(expense => {
        csvContent += [
          expense.id || '',
          `"${(expense.name || '').replace(/"/g, '""')}"`,
          expense.amount || 0,
          `"${(expense.description || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
      });
    }

    return csvContent;
  }

  /**
   * Parse budget CSV content
   */
  private parseBudgetCSV(content: string): BudgetData | null {
    const lines = content.split('\n');
    
    if (lines[0] === 'No budget data') {
      return null;
    }

    // Parse basic budget info
    const basicHeaders = lines[0].split(',');
    const basicValues = lines[1].split(',');
    
    const budget: BudgetData = {
      id: basicValues[0] ? parseInt(basicValues[0]) : undefined,
      grossIncome: basicValues[1] ? parseFloat(basicValues[1]) : 0,
      useTwoWeekPayStub: basicValues[2] === 'true',
      payDeductions: [],
      annualExpenses: [],
      monthlyExpenses: [],
      createdAt: basicValues[3] ? new Date(basicValues[3]) : undefined,
      updatedAt: basicValues[4] ? new Date(basicValues[4]) : undefined
    };

    // Parse sections
    let currentSection = '';
    let sectionStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'PAY_DEDUCTIONS') {
        currentSection = 'PAY_DEDUCTIONS';
        sectionStartIndex = i + 2; // Skip header line
      } else if (line === 'ANNUAL_EXPENSES') {
        currentSection = 'ANNUAL_EXPENSES';
        sectionStartIndex = i + 2; // Skip header line
      } else if (line === 'MONTHLY_EXPENSES') {
        currentSection = 'MONTHLY_EXPENSES';
        sectionStartIndex = i + 2; // Skip header line
      } else if (currentSection && i >= sectionStartIndex && line && !line.includes('_EXPENSES') && !line.includes('_DEDUCTIONS')) {
        const values = this.parseCSVLine(line);
        
        if (values.length >= 3) {
          const item = {
            id: values[0] ? parseInt(values[0]) : undefined,
            name: values[1] || '',
            amount: values[2] ? parseFloat(values[2]) : 0,
            description: values[3] || ''
          };

          if (currentSection === 'PAY_DEDUCTIONS') {
            budget.payDeductions.push(item);
          } else if (currentSection === 'ANNUAL_EXPENSES') {
            budget.annualExpenses.push(item);
          } else if (currentSection === 'MONTHLY_EXPENSES') {
            budget.monthlyExpenses.push(item);
          }
        }
      }
    }

    return budget;
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Clear all local data
   */
  private async clearLocalData(): Promise<void> {
    try {
      // Get all portfolios and calculations
      const [portfolios, calculations] = await Promise.all([
        this.dbService.getAllPortfolios().toPromise(),
        this.dbService.getAllCalculations().toPromise()
      ]);

      // Delete all calculations
      if (calculations) {
        for (const calculation of calculations) {
          if (calculation.id) {
            await this.dbService.deleteCalculation(calculation.id).toPromise();
          }
        }
      }

      // Delete all portfolios except the default one
      if (portfolios) {
        for (const portfolio of portfolios) {
          if (portfolio.id && portfolio.id !== 1) { // Keep default portfolio
            await this.dbService.deletePortfolio(portfolio.id).toPromise();
          }
        }
      }

      // Clear all budget data
      await this.dbService.clearAllBudgets().toPromise();
    } catch (error) {
      throw new Error(`Failed to clear local data: ${error}`);
    }
  }
}
