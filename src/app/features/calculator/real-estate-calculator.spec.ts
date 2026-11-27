import type { OwnedInputs, PurchaseInputs, SellingInputs } from '../../models/property-inputs';
import { calculatePropertyResults, roundToHundredth, type OperatingResults } from './real-estate-calculator';

const purchase: PurchaseInputs = {
  ownershipStatus: 'to_be_purchased', purchasePrice: 125000, downPayment: 25000,
  usePercentageForDownPayment: false, rehabCosts: 0, closingCosts: 0, financeRehabAndClosing: false,
  interestRate: 6, termYears: 30, paymentsPerYear: 12,
  insuranceCost: 0, propertyTaxes: 0, mortgageInsurance: 0, usePercentageForMortgageInsurance: true,
  monthlyHOA: 0, monthlyUtilities: 0, rentalIncomeMode: 'long_term', expectedRentalIncome: 0,
  operatingExpenses: 0, usePercentageForOpex: false, capitalExpenditures: 0, usePercentageForCapex: false,
  appreciationRate: 3, plannedHoldPeriodYears: 5, sellingCostsPercentage: 6,
  scheduleEDeductibleAmount: 0, rentalUsePercentage: 100,
};

const owned: OwnedInputs = {
  ownershipStatus: 'already_owned', purchasePrice: 150000, existingLoanBalance: 12000,
  interestRate: 0, termYears: 2, rehabCosts: 0, mortgageInsurance: 0, insuranceCost: 0,
  propertyTaxes: 0, monthlyHOA: 0, monthlyUtilities: 0,
  rentalIncomeMode: 'long_term', expectedRentalIncome: 0, operatingExpenses: 0,
  usePercentageForOpex: false, capitalExpenditures: 0, usePercentageForCapex: false,
  appreciationRate: 0, plannedHoldPeriodYears: 2, sellingCostsPercentage: 6,
  scheduleEDeductibleAmount: 0, rentalUsePercentage: 100,
};

function operating(raw: object): OperatingResults {
  const result = calculatePropertyResults(raw);
  if (result.kind !== 'operating') throw new Error(JSON.stringify(result));
  return result;
}

describe('calculatePropertyResults', () => {
  it('matches the five-year projection, with Year 1 interest and hold-average equity kept separate', () => {
    const result = operating(purchase);
    expect(roundToHundredth(result.monthlyPrincipalAndInterestUSD)).toBe(599.55);
    expect(result.loan.years[0].interestUSD).toBeCloseTo(5966.59458956, 8);
    expect(roundToHundredth(result.exit.remainingBalanceUSD)).toBe(93054.36);
    expect(roundToHundredth(result.exit.principalEquityGainUSD)).toBe(6945.64);
    expect(roundToHundredth(result.exit.appreciationEquityGainUSD)).toBe(19909.26);
    expect(roundToHundredth(result.averageMonthlyEquityGainUSD)).toBe(447.58);
    expect(roundToHundredth(result.exit.netProceedsUSD)).toBe(43160.35);
    expect(result.yearlyTotalReturnUSD).toBeCloseTo(
      12 * (result.averageMonthlyEquityGainUSD + result.monthlyCashFlowUSD), 8,
    );
    expect(result.equity[0].totalEquityUSD).toBe(25000);
  });

  it('projects through maturity and keeps appreciation after payoff, including negative appreciation', () => {
    const atMaturity = operating({ ...purchase, plannedHoldPeriodYears: 30 });
    const afterMaturity = operating({ ...purchase, plannedHoldPeriodYears: 35 });
    expect(atMaturity.exit.remainingBalanceUSD).toBe(0);
    expect(afterMaturity.loan.years[34].paymentsUSD).toBe(0);
    expect(afterMaturity.exit.propertyValueUSD).toBeGreaterThan(atMaturity.exit.propertyValueUSD);
    expect(operating({ ...purchase, appreciationRate: -3 }).exit.appreciationEquityGainUSD).toBeLessThan(0);
    expect(operating({ ...purchase, plannedHoldPeriodYears: undefined }).holdYears).toBe(30);
  });

  it('finances rehab and closing only when requested and uses property value for appreciation', () => {
    const inputs = { ...purchase, purchasePrice: 200000, downPayment: 20, usePercentageForDownPayment: true,
      rehabCosts: 10000, closingCosts: 5000 };
    const cash = operating(inputs);
    const financed = operating({ ...inputs, financeRehabAndClosing: true });
    expect(cash.initialLoanBalanceUSD).toBe(160000);
    expect(cash.totalCashInvestedUSD).toBe(55000);
    expect(financed.initialLoanBalanceUSD).toBe(175000);
    expect(financed.totalCashInvestedUSD).toBe(40000);
    expect(financed.exit.propertyValueUSD).toBe(cash.exit.propertyValueUSD);
  });

  it('applies purchase PMI below 20% down and stops at exactly 20%', () => {
    const inputs = { ...purchase, purchasePrice: 200000, usePercentageForDownPayment: true,
      downPayment: 19.9, mortgageInsurance: 0.5 };
    expect(roundToHundredth(operating(inputs).monthlyMortgageInsuranceUSD)).toBe(66.75);
    expect(operating({ ...inputs, downPayment: 20 }).monthlyMortgageInsuranceUSD).toBe(0);
    expect(operating({ ...inputs, downPayment: 100 }).monthlyPrincipalAndInterestUSD).toBe(0);
  });

  it('uses a supplied owned payment for cash flow and payoff while blank requests an estimate', () => {
    const estimated = operating({ ...owned, existingMonthlyPI: '' });
    expect(estimated.monthlyPrincipalAndInterestUSD).toBe(500);
    expect(estimated.loan.years[0].endingBalanceUSD).toBe(6000);
    const supplied = operating({ ...owned, existingMonthlyPI: 750, mortgageInsurance: 120 });
    expect(supplied.monthlyPrincipalAndInterestUSD).toBe(750);
    expect(supplied.monthlyMortgageInsuranceUSD).toBe(10);
    expect(supplied.loan.years[0].endingBalanceUSD).toBe(3000);
    expect(supplied.loan.payoffPeriod).toBe(16);
    expect(supplied.totalCashInvestedUSD).toBe(0);
    expect(supplied.annualCashOnCashPercentage).toBe(0);

    const longer = operating({ ...owned, termYears: 1, existingMonthlyPI: 500 });
    expect(longer.loan.years[0].endingBalanceUSD).toBe(6000);
    expect(longer.loan.payoffPeriod).toBe(24);
  });

  it('rejects interest-only and negative-amortization payments before rounding', () => {
    const inputs = { ...owned, existingLoanBalance: 120000, interestRate: 6, termYears: 30 };
    for (const payment of [0, 500, 600]) {
      const result = calculatePropertyResults({ ...inputs, existingMonthlyPI: payment });
      expect(result.kind).toBe('invalid');
      if (result.kind === 'invalid') expect(result.errors.existingMonthlyPI).toContain('above the first month');
    }
    expect(operating({ ...inputs, existingMonthlyPI: 600.01 }).monthlyPrincipalAndInterestUSD).toBe(600.01);
    expect(operating(inputs).monthlyPrincipalAndInterestUSD).toBeGreaterThan(600);
  });

  it('uses a fixed 365-day STR year and charges HOA and utilities even with zero rent', () => {
    const inputs = {
      ...owned, existingLoanBalance: 0, monthlyHOA: 90, monthlyUtilities: 60,
      rentalIncomeMode: 'short_term', nightlyRate: 120, occupancyRatePercentage: 50,
      operatingExpenses: 10, usePercentageForOpex: true, capitalExpenditures: 5, usePercentageForCapex: true,
    };
    const result = operating(inputs);
    expect(result.monthlyRentalIncomeUSD).toBe(1825);
    expect(result.monthlyOperatingExpensesUSD).toBe(182.5);
    expect(result.monthlyCapitalExpendituresUSD).toBe(91.25);
    expect(result.monthlyCashFlowUSD).toBe(1401.25);
    expect(operating({ ...inputs, occupancyRatePercentage: 0 }).monthlyCashFlowUSD).toBe(-150);
    expect(operating({ ...inputs, occupancyRatePercentage: 100 }).monthlyRentalIncomeUSD).toBe(3650);
  });

  it('keeps an immediate underwater sale signed and omits operating figures', () => {
    const inputs: SellingInputs = {
      ownershipStatus: 'selling', purchasePrice: 200000, sellingCostsPercentage: 6, existingLoanBalance: 205000,
    };
    const result = calculatePropertyResults(inputs);
    expect(result.kind).toBe('sale');
    if (result.kind !== 'sale') return;
    expect(result.netSaleProceedsUSD).toBe(-17000);
    expect(40000 - result.cashToCloseOffsetUSD).toBe(57000);
    expect(result.monthlyCashFlowUSD).toBe(0);
    expect(result.totalCashInvestedUSD).toBe(0);
    expect('loan' in result).toBeFalse();
    expect(calculatePropertyResults({ ...inputs, purchasePrice: 0 }).kind).toBe('sale');
  });

  it('allocates actual Year 1 interest and operating costs for Schedule E and excludes CapEx', () => {
    const input = {
      ...purchase, expectedRentalIncome: 1000, operatingExpenses: 100, insuranceCost: 600, propertyTaxes: 1800,
      monthlyHOA: 40, monthlyUtilities: 60, capitalExpenditures: 200,
      scheduleEDeductibleAmount: 110000, rentalUsePercentage: 50,
    };
    const result = operating(input);
    expect(result.tax.annualRentalIncomeUSD).toBe(12000);
    expect(result.tax.allocatedOperatingCostsUSD).toBe(2400);
    expect(roundToHundredth(result.tax.allocatedYearOneInterestUSD)).toBe(2983.30);
    expect(roundToHundredth(result.tax.annualPretaxIncomeUSD)).toBe(6616.70);
    expect(result.tax.annualDepreciationUSD).toBe(2000);
    expect(roundToHundredth(result.tax.annualTaxableIncomeUSD)).toBe(4616.70);
    const withCapex = operating({ ...input, capitalExpenditures: 300 });
    expect(withCapex.monthlyCashFlowUSD).toBeCloseTo(result.monthlyCashFlowUSD - 100, 10);
    expect(withCapex.tax.annualTaxableIncomeUSD).toBe(result.tax.annualTaxableIncomeUSD);
    expect(operating({ ...input, rentalUsePercentage: 0 }).tax.annualTaxableIncomeUSD).toBe(12000);
  });

  it('labels missing inputs as incomplete and rejects invalid active values', () => {
    expect(calculatePropertyResults({ ...purchase, purchasePrice: null }))
      .toEqual(jasmine.objectContaining({ kind: 'invalid', incomplete: true }));
    for (const overrides of [{ downPayment: 125001 }, { paymentsPerYear: 3.5 }, { interestRate: NaN },
      { appreciationRate: -51 }, { plannedHoldPeriodYears: 51 }, { monthlyUtilities: -1 }]) {
      expect(calculatePropertyResults({ ...purchase, ...overrides }).kind).toBe('invalid');
    }
    expect(calculatePropertyResults({
      ...owned, existingLoanBalance: 0, termYears: undefined, plannedHoldPeriodYears: undefined,
    }).kind).toBe('invalid');
    expect(operating({ ...owned, existingLoanBalance: 0, existingMonthlyPI: 0 }).monthlyPrincipalAndInterestUSD).toBe(0);
  });

  it('rounds half away from zero and normalizes negative zero only at the display boundary', () => {
    expect(roundToHundredth(10.075)).toBe(10.08);
    expect(roundToHundredth(-10.075)).toBe(-10.08);
    expect(Object.is(roundToHundredth(-0.001), -0)).toBeFalse();
  });
});
