import { Injectable } from '@angular/core';
import { RealEstateCalculation, CalculationResults } from '../models/real-estate.interface';

@Injectable({
  providedIn: 'root'
})
export class RealEstateCalculatorService {

  constructor() {}

  calculateResults(calculation: RealEstateCalculation): CalculationResults {
    const {
      purchasePrice,
      rehabCosts,
      closingCosts,
      downPayment,
      usePercentageForDownPayment,
      interestRate,
      termYears,
      paymentsPerYear,
      insuranceCost,
      mortgageInsurance,
      usePercentageForMortgageInsurance,
      propertyTaxes,
      expectedRentalIncome,
      operatingExpenses,
      usePercentageForOpex,
      capitalExpenditures,
      usePercentageForCapex,
      appreciationRate,
      scheduleEDeductibleAmount,
      rentalUsePercentage
    } = calculation;

    // Calculate total acquisition cost
    const totalAcquisitionCost = purchasePrice + rehabCosts + closingCosts;
    
    // Calculate down payment amount
    let downPaymentAmount = downPayment;
    if (usePercentageForDownPayment) {
      downPaymentAmount = (downPayment / 100) * purchasePrice;
    }
    
    // Calculate loan amount
    const loanAmount = totalAcquisitionCost - downPaymentAmount;
    
    // Calculate monthly mortgage payment using PMT formula
    const monthlyInterestRate = interestRate / 100 / paymentsPerYear;
    const totalPayments = termYears * paymentsPerYear;
    
    let monthlyMortgagePayment = 0;
    if (loanAmount > 0 && monthlyInterestRate > 0) {
      monthlyMortgagePayment = loanAmount * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalPayments)) / 
        (Math.pow(1 + monthlyInterestRate, totalPayments) - 1);
    } else if (loanAmount > 0) {
      // If interest rate is 0, just divide by number of payments
      monthlyMortgagePayment = loanAmount / totalPayments;
    }
    
    // Calculate monthly operating expenses
    let monthlyOperatingExpenses = operatingExpenses;
    if (usePercentageForOpex) {
      monthlyOperatingExpenses = (operatingExpenses / 100) * expectedRentalIncome;
    }
    
    // Calculate monthly capital expenditures
    let monthlyCapitalExpenditures = capitalExpenditures;
    if (usePercentageForCapex) {
      monthlyCapitalExpenditures = (capitalExpenditures / 100) * expectedRentalIncome;
    }
    
    // Calculate monthly insurance and taxes
    const monthlyInsurance = insuranceCost / 12;
    
    // Calculate monthly mortgage insurance
    let monthlyMortgageInsurance = mortgageInsurance / 12;
    if (usePercentageForMortgageInsurance) {
      monthlyMortgageInsurance = (mortgageInsurance / 100) * loanAmount / 12;
    }
    
    const monthlyPropertyTaxes = propertyTaxes / 12;
    
    // Calculate total monthly expenses
    const totalMonthlyExpenses = monthlyMortgagePayment + monthlyOperatingExpenses + 
                               monthlyCapitalExpenditures + monthlyInsurance + monthlyMortgageInsurance + monthlyPropertyTaxes;
    
    // Calculate monthly income after expenses
    const monthlyIncomeAfterExpenses = expectedRentalIncome - monthlyOperatingExpenses - 
                                     monthlyCapitalExpenditures - monthlyInsurance - monthlyMortgageInsurance - monthlyPropertyTaxes;
    
    // Calculate cash flow
    const monthlyCashFlow = expectedRentalIncome - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    
    // Calculate Return on Investment (ROI)
    const totalCashInvested = downPaymentAmount + rehabCosts + closingCosts;
    const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
    
    // Calculate future value of property
    const futurePropertyValue = purchasePrice * Math.pow(1 + (appreciationRate / 100), termYears);
    
    // Calculate average monthly equity gain (property appreciation / months)
    const monthlyEquityGain = (futurePropertyValue - purchasePrice) / (termYears * 12);
    
    // Calculate monthly total return (cash flow + equity gain)
    const monthlyTotalReturn = monthlyCashFlow + monthlyEquityGain;
    
    // Calculate monthly return as percentage of money invested
    const monthlyReturnPercentage = totalCashInvested > 0 ? (monthlyTotalReturn / totalCashInvested) * 100 : 0;
    
    // Calculate yearly values
    const yearlyEquityGain = monthlyEquityGain * 12;
    const yearlyTotalReturn = monthlyTotalReturn * 12;
    const yearlyReturnPercentage = totalCashInvested > 0 ? (yearlyTotalReturn / totalCashInvested) * 100 : 0;
    
    // Calculate remaining loan balance after term
    const remainingLoanBalance = 0;
    // For this example, we'll assume the loan is paid off after the term
    // In a real scenario, this would need more complex amortization calculation
    
    // Calculate total profit after selling
    const totalMortgagePayments = monthlyMortgagePayment * totalPayments;
    const totalOperatingExpenses = (monthlyOperatingExpenses + monthlyCapitalExpenditures + 
                                  monthlyInsurance + monthlyMortgageInsurance + monthlyPropertyTaxes) * totalPayments;
    const totalRentalIncome = expectedRentalIncome * totalPayments;
    const netRentalProfit = totalRentalIncome - totalOperatingExpenses - totalMortgagePayments;
    
    // Assuming 6% selling costs (agent fees, etc.)
    const sellingCosts = futurePropertyValue * 0.06;
    const netProceedsFromSale = futurePropertyValue - remainingLoanBalance - sellingCosts;
    
    const totalProfit = netRentalProfit + netProceedsFromSale - totalCashInvested;
    const totalROI = totalCashInvested > 0 ? (totalProfit / totalCashInvested) * 100 : 0;

    // Calculate tax-related values
    // Annual depreciation = (Schedule E deductible amount / 27.5 years) * rental use percentage
    const annualDepreciation = scheduleEDeductibleAmount > 0 ? 
      (scheduleEDeductibleAmount / 27.5) * (rentalUsePercentage / 100) : 0;
    
    // Pre-tax income = annual rental income - annual operating expenses (excluding mortgage payments)
    const annualRentalIncome = expectedRentalIncome * 12;
    const annualOperatingExpenses = (monthlyOperatingExpenses + monthlyCapitalExpenditures + 
                                   monthlyInsurance + monthlyMortgageInsurance + monthlyPropertyTaxes) * 12;
    const pretaxIncome = annualRentalIncome - annualOperatingExpenses;
    
    // Taxable income = pre-tax income - depreciation
    const taxableIncome = pretaxIncome - annualDepreciation;

    return {
      totalAcquisitionCost: this.round(totalAcquisitionCost),
      downPaymentAmount: this.round(downPaymentAmount),
      loanAmount: this.round(loanAmount),
      monthlyMortgagePayment: this.round(monthlyMortgagePayment),
      monthlyOperatingExpenses: this.round(monthlyOperatingExpenses),
      monthlyCapitalExpenditures: this.round(monthlyCapitalExpenditures),
      monthlyInsurance: this.round(monthlyInsurance),
      monthlyMortgageInsurance: this.round(monthlyMortgageInsurance),
      monthlyPropertyTaxes: this.round(monthlyPropertyTaxes),
      totalMonthlyExpenses: this.round(totalMonthlyExpenses),
      monthlyIncomeAfterExpenses: this.round(monthlyIncomeAfterExpenses),
      monthlyCashFlow: this.round(monthlyCashFlow),
      annualCashFlow: this.round(annualCashFlow),
      cashOnCashReturn: this.round(cashOnCashReturn),
      futurePropertyValue: this.round(futurePropertyValue),
      totalCashInvested: this.round(totalCashInvested),
      totalProfit: this.round(totalProfit),
      totalROI: this.round(totalROI),
      netProceedsFromSale: this.round(netProceedsFromSale),
      sellingCosts: this.round(sellingCosts),
      // New return calculations
      monthlyEquityGain: this.round(monthlyEquityGain),
      monthlyTotalReturn: this.round(monthlyTotalReturn),
      monthlyReturnPercentage: this.round(monthlyReturnPercentage),
      yearlyEquityGain: this.round(yearlyEquityGain),
      yearlyTotalReturn: this.round(yearlyTotalReturn),
      yearlyReturnPercentage: this.round(yearlyReturnPercentage),
      // Tax calculations
      annualDepreciation: this.round(annualDepreciation),
      taxableIncome: this.round(taxableIncome),
      pretaxIncome: this.round(pretaxIncome)
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
