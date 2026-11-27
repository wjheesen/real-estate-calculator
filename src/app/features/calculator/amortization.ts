export interface LoanInputs {
  readonly balanceUSD: number;
  readonly annualRatePercentage: number;
  readonly termYears: number;
  readonly paymentsPerYear: number;
  readonly projectionYears: number;
  readonly existingPaymentUSD?: number;
}

export interface LoanYear {
  readonly year: number;
  readonly interestUSD: number;
  readonly principalUSD: number;
  readonly paymentsUSD: number;
  readonly endingBalanceUSD: number;
}

export interface LoanSchedule {
  readonly paymentPerPeriodUSD: number;
  readonly initialMonthlyPaymentUSD: number;
  readonly payoffPeriod: number | null;
  readonly years: readonly LoanYear[];
}

/** Given validated inputs, model each payment and report actual annual principal and interest. */
export function amortizeLoan(inputs: LoanInputs): LoanSchedule {
  const {
    balanceUSD, annualRatePercentage, termYears, paymentsPerYear, projectionYears, existingPaymentUSD,
  } = inputs;
  const periods = termYears * paymentsPerYear;
  const rate = annualRatePercentage / (100 * paymentsPerYear);
  const payment = balanceUSD === 0 ? 0 : existingPaymentUSD ?? (
    rate === 0 ? balanceUSD / periods : balanceUSD * rate / -Math.expm1(-periods * Math.log1p(rate))
  );

  let balance = balanceUSD;
  let payoffPeriod: number | null = balance === 0 ? 0 : null;
  const years: LoanYear[] = [];
  for (let year = 1; year <= projectionYears; year++) {
    let interestUSD = 0;
    let principalUSD = 0;
    for (let index = 1; index <= paymentsPerYear && balance > 0; index++) {
      const period = (year - 1) * paymentsPerYear + index;
      const interest = balance * rate;
      const due = balance + interest;
      const scheduledMaturity = existingPaymentUSD === undefined && period === periods;
      const paidInFull = scheduledMaturity || payment >= due;
      const principal = paidInFull ? balance : payment - interest;
      interestUSD += interest;
      principalUSD += principal;
      balance = paidInFull ? 0 : balance - principal;
      if (paidInFull) payoffPeriod = period;
    }
    years.push({ year, interestUSD, principalUSD, paymentsUSD: interestUSD + principalUSD, endingBalanceUSD: balance });
  }
  return { paymentPerPeriodUSD: payment, initialMonthlyPaymentUSD: payment * (paymentsPerYear / 12), payoffPeriod, years };
}
