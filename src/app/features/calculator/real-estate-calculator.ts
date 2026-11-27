import type { OwnedInputs, PropertyInputs, PurchaseInputs } from '../../models/property-inputs';
import { propertyRecordInputs } from '../../models/property-record-shape';
import { amortizeLoan, type LoanSchedule } from './amortization';
import { validatePropertyInputs, type PropertyValidation } from './property-validation';

export interface SaleResults {
  readonly kind: 'sale';
  readonly salePriceUSD: number;
  readonly sellingCostsUSD: number;
  readonly loanPayoffUSD: number;
  readonly totalOutflowsUSD: number;
  readonly netSaleProceedsUSD: number;
  readonly cashToCloseOffsetUSD: number;
  readonly totalCashInvestedUSD: 0;
  readonly monthlyCashFlowUSD: 0;
  readonly annualCashFlowUSD: 0;
}

export interface EquityYear {
  readonly year: number;
  readonly propertyValueUSD: number;
  readonly remainingBalanceUSD: number;
  readonly principalEquityGainUSD: number;
  readonly appreciationEquityGainUSD: number;
  readonly totalEquityUSD: number;
}

export interface ScheduleEEstimate {
  readonly annualRentalIncomeUSD: number;
  readonly buildingBasisUSD: number;
  readonly rentalUsePercentage: number;
  readonly allocatedOperatingCostsUSD: number;
  readonly allocatedYearOneInterestUSD: number;
  readonly annualPretaxIncomeUSD: number;
  readonly annualDepreciationUSD: number;
  readonly annualTaxableIncomeUSD: number;
}

export interface OperatingResults {
  readonly kind: 'operating';
  readonly ownershipStatus: 'to_be_purchased' | 'already_owned';
  readonly propertyValueUSD: number;
  readonly downPaymentUSD: number;
  readonly initialLoanBalanceUSD: number;
  readonly initialEquityUSD: number;
  readonly cashFundedCostsUSD: number;
  readonly financedCostsUSD: number;
  readonly totalCashInvestedUSD: number;
  readonly loan: LoanSchedule;
  readonly monthlyRentalIncomeUSD: number;
  readonly monthlyPrincipalAndInterestUSD: number;
  readonly monthlyMortgageInsuranceUSD: number;
  readonly monthlyPropertyTaxesUSD: number;
  readonly monthlyInsuranceUSD: number;
  readonly monthlyHoaUSD: number;
  readonly monthlyUtilitiesUSD: number;
  readonly monthlyOperatingExpensesUSD: number;
  readonly monthlyCapitalExpendituresUSD: number;
  readonly monthlyTotalExpensesUSD: number;
  readonly monthlyCashFlowUSD: number;
  readonly annualCashFlowUSD: number;
  readonly annualCashOnCashPercentage: number;
  readonly holdYears: number;
  readonly equity: readonly EquityYear[];
  readonly exit: EquityYear & { readonly sellingCostsUSD: number; readonly netProceedsUSD: number };
  readonly averageMonthlyEquityGainUSD: number;
  readonly monthlyTotalReturnUSD: number;
  readonly yearlyTotalReturnUSD: number;
  readonly monthlyTotalReturnPercentage: number;
  readonly yearlyTotalReturnPercentage: number;
  readonly tax: ScheduleEEstimate;
}

export type PropertyResults = SaleResults | OperatingResults;
export type PropertyCalculation = PropertyResults | (PropertyValidation & { readonly kind: 'invalid' });

const decimalHundredths = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  maximumFractionDigits: 2,
});

export function roundToHundredth(value: number): number {
  const rounded = Number(decimalHundredths.format(value));
  return rounded === 0 ? 0 : rounded;
}

function amount(value: number, percentage: boolean, base: number): number {
  return percentage ? base * (value / 100) : value;
}

function percentOfInvestment(value: number, cash: number): number {
  return cash > 0 ? 100 * (value / cash) : 0;
}

function operatingResults(raw: PurchaseInputs | OwnedInputs): OperatingResults {
  const value = raw.purchasePrice;
  const purchasing = raw.ownershipStatus === 'to_be_purchased';
  const down = purchasing ? amount(raw.downPayment, raw.usePercentageForDownPayment, value) : 0;
  const costs = raw.rehabCosts + (purchasing ? raw.closingCosts : 0);
  const financed = purchasing && raw.financeRehabAndClosing ? costs : 0;
  const cashCosts = costs - financed;
  const balance = purchasing ? value - down + financed : raw.existingLoanBalance;
  const cash = down + cashCosts;
  const hold = (raw.plannedHoldPeriodYears ?? raw.termYears)!;
  const loan = amortizeLoan({
    balanceUSD: balance,
    annualRatePercentage: raw.interestRate ?? 0,
    termYears: raw.termYears ?? hold,
    paymentsPerYear: purchasing ? raw.paymentsPerYear : 12,
    projectionYears: hold,
    existingPaymentUSD: purchasing ? undefined : raw.existingMonthlyPI,
  });

  const monthlyRent = raw.rentalIncomeMode === 'long_term'
    ? raw.expectedRentalIncome : raw.nightlyRate * (raw.occupancyRatePercentage / 100) * (365 / 12);
  const monthlyPI = loan.initialMonthlyPaymentUSD;
  const monthlyPMI = balance === 0 || (purchasing && down / value >= 0.2) ? 0
    : amount(raw.mortgageInsurance, purchasing && raw.usePercentageForMortgageInsurance, balance) / 12;
  const monthlyTaxes = raw.propertyTaxes / 12;
  const monthlyInsurance = raw.insuranceCost / 12;
  const monthlyOpex = amount(raw.operatingExpenses, raw.usePercentageForOpex, monthlyRent);
  const monthlyCapex = amount(raw.capitalExpenditures, raw.usePercentageForCapex, monthlyRent);
  const monthlyDeductibleCosts = monthlyPMI + monthlyTaxes + monthlyInsurance + raw.monthlyHOA
    + raw.monthlyUtilities + monthlyOpex;
  const monthlyExpenses = monthlyPI + monthlyDeductibleCosts + monthlyCapex;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const equity: EquityYear[] = [{
    year: 0, propertyValueUSD: value, remainingBalanceUSD: balance,
    principalEquityGainUSD: 0, appreciationEquityGainUSD: 0, totalEquityUSD: value - balance,
  }];
  for (const year of loan.years) {
    const projected = value * Math.pow(1 + raw.appreciationRate / 100, year.year);
    equity.push({
      year: year.year,
      propertyValueUSD: projected,
      remainingBalanceUSD: year.endingBalanceUSD,
      principalEquityGainUSD: balance - year.endingBalanceUSD,
      appreciationEquityGainUSD: projected - value,
      totalEquityUSD: projected - year.endingBalanceUSD,
    });
  }
  const finalYear = equity[hold];
  const exitCosts = finalYear.propertyValueUSD * (raw.sellingCostsPercentage / 100);
  const monthlyGain = (finalYear.principalEquityGainUSD + finalYear.appreciationEquityGainUSD) / (12 * hold);
  const totalReturn = monthlyCashFlow + monthlyGain;

  const rentalShare = raw.rentalUsePercentage / 100;
  const annualRent = monthlyRent * 12;
  const allocatedOperatingCosts = rentalShare * (monthlyDeductibleCosts * 12);
  const allocatedInterest = rentalShare * loan.years[0].interestUSD;
  const pretax = annualRent - allocatedOperatingCosts - allocatedInterest;
  const depreciation = rentalShare * (raw.scheduleEDeductibleAmount / 27.5);

  return {
    kind: 'operating',
    ownershipStatus: raw.ownershipStatus,
    propertyValueUSD: value,
    downPaymentUSD: down,
    initialLoanBalanceUSD: balance,
    initialEquityUSD: value - balance,
    cashFundedCostsUSD: cashCosts,
    financedCostsUSD: financed,
    totalCashInvestedUSD: cash,
    loan,
    monthlyRentalIncomeUSD: monthlyRent,
    monthlyPrincipalAndInterestUSD: monthlyPI,
    monthlyMortgageInsuranceUSD: monthlyPMI,
    monthlyPropertyTaxesUSD: monthlyTaxes,
    monthlyInsuranceUSD: monthlyInsurance,
    monthlyHoaUSD: raw.monthlyHOA,
    monthlyUtilitiesUSD: raw.monthlyUtilities,
    monthlyOperatingExpensesUSD: monthlyOpex,
    monthlyCapitalExpendituresUSD: monthlyCapex,
    monthlyTotalExpensesUSD: monthlyExpenses,
    monthlyCashFlowUSD: monthlyCashFlow,
    annualCashFlowUSD: annualCashFlow,
    annualCashOnCashPercentage: percentOfInvestment(annualCashFlow, cash),
    holdYears: hold,
    equity,
    exit: { ...finalYear, sellingCostsUSD: exitCosts, netProceedsUSD: finalYear.totalEquityUSD - exitCosts },
    averageMonthlyEquityGainUSD: monthlyGain,
    monthlyTotalReturnUSD: totalReturn,
    yearlyTotalReturnUSD: totalReturn * 12,
    monthlyTotalReturnPercentage: percentOfInvestment(totalReturn, cash),
    yearlyTotalReturnPercentage: percentOfInvestment(totalReturn * 12, cash),
    tax: {
      annualRentalIncomeUSD: annualRent,
      buildingBasisUSD: raw.scheduleEDeductibleAmount,
      rentalUsePercentage: raw.rentalUsePercentage,
      allocatedOperatingCostsUSD: allocatedOperatingCosts,
      allocatedYearOneInterestUSD: allocatedInterest,
      annualPretaxIncomeUSD: pretax,
      annualDepreciationUSD: depreciation,
      annualTaxableIncomeUSD: pretax - depreciation,
    },
  };
}

export function calculatePropertyResults(raw: object): PropertyCalculation {
  const validation = validatePropertyInputs(raw);
  if (Object.keys(validation.errors).length) return { kind: 'invalid', ...validation };
  const inputs = propertyRecordInputs(raw as PropertyInputs);
  if (inputs.ownershipStatus !== 'selling') return operatingResults(inputs);

  const sellingCosts = inputs.purchasePrice * (inputs.sellingCostsPercentage / 100);
  const outflows = sellingCosts + inputs.existingLoanBalance;
  const proceeds = inputs.purchasePrice - outflows;
  return {
    kind: 'sale',
    salePriceUSD: inputs.purchasePrice,
    sellingCostsUSD: sellingCosts,
    loanPayoffUSD: inputs.existingLoanBalance,
    totalOutflowsUSD: outflows,
    netSaleProceedsUSD: proceeds,
    cashToCloseOffsetUSD: proceeds,
    totalCashInvestedUSD: 0,
    monthlyCashFlowUSD: 0,
    annualCashFlowUSD: 0,
  };
}
