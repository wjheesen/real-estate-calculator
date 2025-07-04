import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BudgetData, BudgetCalculations, BudgetWithCalculations, PayDeduction, Expense } from '../models/budget.interface';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private budgetSubject = new BehaviorSubject<BudgetWithCalculations | null>(null);
  
  constructor(private indexedDbService: IndexedDbService) {
    this.loadBudget();
  }

  getBudget(): Observable<BudgetWithCalculations | null> {
    return this.budgetSubject.asObservable();
  }

  saveBudget(budgetData: BudgetData): void {
    const budgetWithCalculations = this.calculateBudget(budgetData);
    
    // Save to IndexedDB
    this.indexedDbService.saveBudget(budgetData).subscribe({
      next: (savedBudget) => {
        const savedWithCalculations = this.calculateBudget(savedBudget);
        this.budgetSubject.next(savedWithCalculations);
      },
      error: (error) => {
        console.error('Error saving budget data:', error);
      }
    });
  }

  private loadBudget(): void {
    this.indexedDbService.getBudget().subscribe({
      next: (budgetData) => {
        if (budgetData) {
          // Ensure expense arrays exist for backwards compatibility
          const completeData = {
            ...budgetData,
            annualExpenses: budgetData.annualExpenses || [],
            monthlyExpenses: budgetData.monthlyExpenses || []
          };
          const budgetWithCalculations = this.calculateBudget(completeData);
          this.budgetSubject.next(budgetWithCalculations);
        }
      },
      error: (error) => {
        console.error('Error loading budget data:', error);
      }
    });
  }

  calculateBudget(budgetData: BudgetData): BudgetWithCalculations {
    const multiplier = budgetData.useTwoWeekPayStub ? 26 : 1;
    
    const grossIncomeAnnual = budgetData.grossIncome * multiplier;
    const totalDeductionsAnnual = budgetData.payDeductions.reduce(
      (sum, deduction) => sum + (deduction.amount * multiplier), 
      0
    );
    const netIncomeAnnual = grossIncomeAnnual - totalDeductionsAnnual;
    
    // Calculate expenses
    const totalAnnualExpenses = (budgetData.annualExpenses || []).reduce(
      (sum, expense) => sum + expense.amount, 
      0
    );
    const totalMonthlyExpenses = (budgetData.monthlyExpenses || []).reduce(
      (sum, expense) => sum + expense.amount, 
      0
    );
    const totalMonthlyExpensesAnnualized = totalMonthlyExpenses * 12;
    const totalExpensesAnnual = totalAnnualExpenses + totalMonthlyExpensesAnnualized;
    
    // Calculate available for housing
    const availableForHousingAnnual = netIncomeAnnual - totalExpensesAnnual;
    const availableForHousingMonthly = availableForHousingAnnual / 12;
    
    const calculations: BudgetCalculations = {
      grossIncomeAnnual,
      totalDeductionsAnnual,
      netIncomeAnnual,
      netIncomeMonthly: netIncomeAnnual / 12,
      grossIncomeMonthly: grossIncomeAnnual / 12,
      totalDeductionsMonthly: totalDeductionsAnnual / 12,
      totalAnnualExpenses,
      totalMonthlyExpenses,
      totalMonthlyExpensesAnnualized,
      totalExpensesAnnual,
      availableForHousingAnnual,
      availableForHousingMonthly
    };

    return {
      ...budgetData,
      calculations
    };
  }

  addPayDeduction(name: string, amount: number, description?: string): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const newDeduction: PayDeduction = {
        id: Date.now(), // Simple ID generation
        name,
        amount,
        description
      };
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        payDeductions: [...currentBudget.payDeductions, newDeduction]
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  updatePayDeduction(id: number, updates: Partial<PayDeduction>): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedDeductions = currentBudget.payDeductions.map(deduction =>
        deduction.id === id ? { ...deduction, ...updates } : deduction
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        payDeductions: updatedDeductions
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  deletePayDeduction(id: number): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedDeductions = currentBudget.payDeductions.filter(
        deduction => deduction.id !== id
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        payDeductions: updatedDeductions
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  clearBudget(): void {
    this.indexedDbService.clearAllBudgets().subscribe({
      next: () => {
        this.budgetSubject.next(null);
      },
      error: (error) => {
        console.error('Error clearing budget data:', error);
      }
    });
  }

  // Expense management methods
  addAnnualExpense(name: string, amount: number, description?: string): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const newExpense: Expense = {
        id: Date.now(),
        name,
        amount,
        description
      };
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        annualExpenses: [...(currentBudget.annualExpenses || []), newExpense]
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  addMonthlyExpense(name: string, amount: number, description?: string): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const newExpense: Expense = {
        id: Date.now(),
        name,
        amount,
        description
      };
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        monthlyExpenses: [...(currentBudget.monthlyExpenses || []), newExpense]
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  updateAnnualExpense(id: number, updates: Partial<Expense>): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedExpenses = (currentBudget.annualExpenses || []).map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        annualExpenses: updatedExpenses
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  updateMonthlyExpense(id: number, updates: Partial<Expense>): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedExpenses = (currentBudget.monthlyExpenses || []).map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        monthlyExpenses: updatedExpenses
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  deleteAnnualExpense(id: number): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedExpenses = (currentBudget.annualExpenses || []).filter(
        expense => expense.id !== id
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        annualExpenses: updatedExpenses
      };
      
      this.saveBudget(updatedBudget);
    }
  }

  deleteMonthlyExpense(id: number): void {
    const currentBudget = this.budgetSubject.value;
    if (currentBudget) {
      const updatedExpenses = (currentBudget.monthlyExpenses || []).filter(
        expense => expense.id !== id
      );
      
      const updatedBudget: BudgetData = {
        ...currentBudget,
        monthlyExpenses: updatedExpenses
      };
      
      this.saveBudget(updatedBudget);
    }
  }
}
