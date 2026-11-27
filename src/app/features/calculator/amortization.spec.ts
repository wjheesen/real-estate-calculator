import { amortizeLoan } from './amortization';

describe('amortizeLoan', () => {
  it('converts nonmonthly 0% payments to their monthly equivalent and reaches zero at maturity', () => {
    const result = amortizeLoan({
      balanceUSD: 120000, annualRatePercentage: 0, termYears: 10, paymentsPerYear: 26, projectionYears: 12,
    });
    expect(result.paymentPerPeriodUSD).toBeCloseTo(461.53846, 5);
    expect(result.initialMonthlyPaymentUSD).toBeCloseTo(1000, 8);
    expect(result.years[0].principalUSD).toBeCloseTo(12000, 8);
    expect(result.years[4].endingBalanceUSD).toBeCloseTo(60000, 8);
    expect(result.years[9].endingBalanceUSD).toBe(0);
    expect(result.years[11].paymentsUSD).toBe(0);
    expect(result.payoffPeriod).toBe(260);
  });

  it('uses a smaller final payment and stops charging debt after an early payoff', () => {
    const result = amortizeLoan({
      balanceUSD: 1000, annualRatePercentage: 0, termYears: 2, paymentsPerYear: 12,
      projectionYears: 2, existingPaymentUSD: 400,
    });
    expect(result.initialMonthlyPaymentUSD).toBe(400);
    expect(result.payoffPeriod).toBe(3);
    expect(result.years.map((year) => year.paymentsUSD)).toEqual([1000, 0]);
  });
});
