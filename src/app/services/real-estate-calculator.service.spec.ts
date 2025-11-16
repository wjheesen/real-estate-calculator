import { TestBed } from '@angular/core/testing';
import { RealEstateCalculatorService } from './real-estate-calculator.service';
import { RealEstateCalculation } from '../models/real-estate.interface';

describe('RealEstateCalculatorService', () => {
  let service: RealEstateCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealEstateCalculatorService);
  });

  it('calculates average projected equity gain based on acquisition cost and term', () => {
    const calculation: RealEstateCalculation = {
      purchasePrice: 100000,
      rehabCosts: 10000,
      closingCosts: 5000,
      downPayment: 20000,
      usePercentageForDownPayment: false,
      interestRate: 4,
      termYears: 30,
      paymentsPerYear: 12,
      insuranceCost: 1000,
      mortgageInsurance: 0,
      usePercentageForMortgageInsurance: false,
      propertyTaxes: 1800,
      expectedRentalIncome: 1800,
      operatingExpenses: 300,
      usePercentageForOpex: false,
      capitalExpenditures: 100,
      usePercentageForCapex: false,
      appreciationRate: 3,
      scheduleEDeductibleAmount: 80000,
      rentalUsePercentage: 100
    };

    const results = service.calculateResults(calculation);

    const termMonths = calculation.termYears * calculation.paymentsPerYear;
    const totalAcquisitionCost = calculation.purchasePrice + calculation.rehabCosts + calculation.closingCosts;
    const futureValue = calculation.purchasePrice * Math.pow(1 + calculation.appreciationRate / 100, calculation.termYears);
    const expectedMonthlyEquityGain = (futureValue - totalAcquisitionCost) / termMonths;

    expect(results.monthlyEquityGain).toBeCloseTo(expectedMonthlyEquityGain, 2);
  });
});