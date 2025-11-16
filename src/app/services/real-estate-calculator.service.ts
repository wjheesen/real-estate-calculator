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

    // Ensure all values are numbers, defaulting to 0 for null/undefined
    const purchasePriceNum = purchasePrice ?? 0;
    const rehabCostsNum = rehabCosts ?? 0;
    const closingCostsNum = closingCosts ?? 0;
    const downPaymentNum = downPayment ?? 0;
    const interestRateNum = interestRate ?? 0;
    const termYearsNum = termYears ?? 1;
    const paymentsPerYearNum = paymentsPerYear ?? 12;
    const insuranceCostNum = insuranceCost ?? 0;
    const mortgageInsuranceNum = mortgageInsurance ?? 0;
    const propertyTaxesNum = propertyTaxes ?? 0;
    const expectedRentalIncomeNum = expectedRentalIncome ?? 0;
    const operatingExpensesNum = operatingExpenses ?? 0;
    const capitalExpendituresNum = capitalExpenditures ?? 0;
    const appreciationRateNum = appreciationRate ?? 0;
    const scheduleEDeductibleAmountNum = scheduleEDeductibleAmount ?? 0;
    const rentalUsePercentageNum = rentalUsePercentage ?? 100;

    // Calculate total acquisition cost
    const totalAcquisitionCost = purchasePriceNum + rehabCostsNum + closingCostsNum;
    
    // Calculate down payment amount
    let downPaymentAmount = downPaymentNum;
    if (usePercentageForDownPayment) {
      downPaymentAmount = (downPaymentNum / 100) * purchasePriceNum;
    }
    
    // For fully-owned properties (purchase price = 0), there's no loan
    const loanAmount = purchasePriceNum > 0 ? Math.max(0, totalAcquisitionCost - downPaymentAmount) : 0;
    
    // Calculate monthly mortgage payment using PMT formula
    const monthlyInterestRate = interestRateNum / 100 / paymentsPerYearNum;
    const totalPayments = termYearsNum * paymentsPerYearNum;
    
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
    let monthlyOperatingExpenses = operatingExpensesNum;
    if (usePercentageForOpex) {
      monthlyOperatingExpenses = (operatingExpensesNum / 100) * expectedRentalIncomeNum;
    }
    
    // Calculate monthly capital expenditures
    let monthlyCapitalExpenditures = capitalExpendituresNum;
    if (usePercentageForCapex) {
      monthlyCapitalExpenditures = (capitalExpendituresNum / 100) * expectedRentalIncomeNum;
    }
    
    // Calculate monthly insurance and taxes
    const monthlyInsurance = insuranceCostNum / 12;
    
    // Calculate monthly mortgage insurance (only if there's a loan)
    let monthlyMortgageInsurance = 0;
    if (loanAmount > 0) {
      monthlyMortgageInsurance = mortgageInsuranceNum / 12;
      if (usePercentageForMortgageInsurance) {
        monthlyMortgageInsurance = (mortgageInsuranceNum / 100) * loanAmount / 12;
      }
    }
    
    const monthlyPropertyTaxes = propertyTaxesNum / 12;
    
    // Calculate total monthly expenses
    const totalMonthlyExpenses = monthlyMortgagePayment + monthlyOperatingExpenses + 
                               monthlyCapitalExpenditures + monthlyInsurance + monthlyMortgageInsurance + monthlyPropertyTaxes;
    
    // Calculate monthly income after expenses
    const monthlyIncomeAfterExpenses = expectedRentalIncomeNum - monthlyOperatingExpenses - 
                     monthlyCapitalExpenditures - monthlyInsurance - monthlyMortgageInsurance - monthlyPropertyTaxes;
    
    // Calculate cash flow
    const monthlyCashFlow = expectedRentalIncomeNum - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    
    // Calculate Return on Investment (ROI)
    // For fully-owned properties, total cash invested includes any rehab/closing costs
    // If no costs, then ROI calculations may not be meaningful
    const totalCashInvested = downPaymentAmount + rehabCostsNum + closingCostsNum;
    const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;
    
    // Calculate future value of property
    const futurePropertyValue = purchasePriceNum * Math.pow(1 + (appreciationRateNum / 100), termYearsNum);
    
    // Calculate average projected equity gain (future value - acquisition cost spread over the loan term)
    const termMonths = Math.max(1, termYearsNum * 12);
    const monthlyEquityGain = termMonths > 0 ? (futurePropertyValue - totalAcquisitionCost) / termMonths : 0;
    
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
    const totalRentalIncome = expectedRentalIncomeNum * totalPayments;
    const netRentalProfit = totalRentalIncome - totalOperatingExpenses - totalMortgagePayments;
    
    // Assuming 6% selling costs (agent fees, etc.)
    const sellingCosts = futurePropertyValue * 0.06;
    const netProceedsFromSale = futurePropertyValue - remainingLoanBalance - sellingCosts;
    
    const totalProfit = netRentalProfit + netProceedsFromSale - totalCashInvested;
    const totalROI = totalCashInvested > 0 ? (totalProfit / totalCashInvested) * 100 : 0;

    // Calculate tax-related values
    // Annual depreciation = (Schedule E deductible amount / 27.5 years) * rental use percentage
    const annualDepreciation = scheduleEDeductibleAmountNum > 0 ? 
      (scheduleEDeductibleAmountNum / 27.5) * (rentalUsePercentageNum / 100) : 0;
    
    // Calculate deductible expenses for Schedule E
    // This includes operating expenses, capital expenditures, insurance, mortgage insurance, and property taxes
    // adjusted by rental use percentage
    const totalAnnualExpenses = (monthlyOperatingExpenses + monthlyCapitalExpenditures + 
                               monthlyInsurance + monthlyMortgageInsurance + monthlyPropertyTaxes) * 12;
    const deductibleExpenses = totalAnnualExpenses * (rentalUsePercentageNum / 100);
    
    // Pre-tax income = annual rental income - deductible expenses
    const annualRentalIncome = expectedRentalIncomeNum * 12;
    const pretaxIncome = annualRentalIncome - deductibleExpenses;
    
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
      pretaxIncome: this.round(pretaxIncome),
      deductibleExpenses: this.round(deductibleExpenses)
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
