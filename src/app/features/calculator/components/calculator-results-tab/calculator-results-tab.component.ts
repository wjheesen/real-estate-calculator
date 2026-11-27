import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CartesianChartComponent } from '../../../../shared/components/charts/cartesian-chart/cartesian-chart.component';
import { formatPercentage, formatUsd } from '../../calculator-formatting';
import type { PropertyResults } from '../../real-estate-calculator';


@Component({
  selector: 'app-calculator-results-tab',
  imports: [CartesianChartComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculator-results-tab.component.html',
  styleUrl: './calculator-results-tab.component.css',
})
export class CalculatorResultsTabComponent {
  readonly result = input.required<PropertyResults>();
  protected readonly money = formatUsd;
  protected readonly sale = computed(() => {
    const r = this.result();
    if (r.kind !== 'sale') return;
    return [
      { label: 'Estimated sale price', value: formatUsd(r.salePriceUSD) },
      { label: 'Selling costs', value: formatUsd(r.sellingCostsUSD) },
      { label: 'Loan payoff', value: formatUsd(r.loanPayoffUSD) },
      { label: 'Net sale proceeds', value: formatUsd(r.netSaleProceedsUSD) },
    ];
  });
  protected readonly operating = computed(() => {
    const result = this.result();
    return result.kind === 'operating' ? result : undefined;
  });

  protected readonly sections = computed(() => {
    const r = this.operating();
    if (!r) return [];
    return [
      { title: 'Investment summary', figures: [
        { label: 'Property value', value: formatUsd(r.propertyValueUSD) },
        { label: 'Initial loan balance', value: formatUsd(r.initialLoanBalanceUSD) },
        { label: 'Starting equity', value: formatUsd(r.initialEquityUSD) },
        { label: 'Down payment', value: formatUsd(r.downPaymentUSD) },
        { label: 'Setup costs paid in cash', value: formatUsd(r.cashFundedCostsUSD) },
        { label: 'Financed costs', value: formatUsd(r.financedCostsUSD) },
        { label: 'Total cash invested', value: formatUsd(r.totalCashInvestedUSD) },
      ] },
      { title: 'Cash flow and returns', figures: [
        { label: 'Monthly cash flow', value: formatUsd(r.monthlyCashFlowUSD) },
        { label: 'Annual cash flow run rate', value: formatUsd(r.annualCashFlowUSD) },
        { label: 'Annual cash-on-cash return', value: formatPercentage(r.annualCashOnCashPercentage) },
        { label: `Average monthly equity gain over ${r.holdYears} years`, value: formatUsd(r.averageMonthlyEquityGainUSD) },
        { label: 'Monthly cash flow plus average equity gain', value: formatUsd(r.monthlyTotalReturnUSD) },
        { label: 'Yearly cash flow plus average equity gain', value: formatUsd(r.yearlyTotalReturnUSD) },
        { label: 'Monthly total return on cash invested', value: formatPercentage(r.monthlyTotalReturnPercentage) },
        { label: 'Yearly total return on cash invested', value: formatPercentage(r.yearlyTotalReturnPercentage) },
      ] },
      { title: `Exit at year ${r.holdYears}`, figures: [
        { label: 'Projected property value', value: formatUsd(r.exit.propertyValueUSD) },
        { label: 'Remaining loan balance', value: formatUsd(r.exit.remainingBalanceUSD) },
        { label: 'Cumulative principal paydown', value: formatUsd(r.exit.principalEquityGainUSD) },
        { label: 'Cumulative appreciation', value: formatUsd(r.exit.appreciationEquityGainUSD) },
        { label: 'Total equity', value: formatUsd(r.exit.totalEquityUSD) },
        { label: 'Selling costs', value: formatUsd(r.exit.sellingCostsUSD) },
        { label: 'Projected net sale proceeds', value: formatUsd(r.exit.netProceedsUSD) },
      ] },
    ];
  });

  protected readonly cashFlow = computed(() => {
    const r = this.operating();
    if (!r) return [];
    return [
      ['Rent', r.monthlyRentalIncomeUSD],
      ['Mortgage P&I', -r.monthlyPrincipalAndInterestUSD],
      ['Mortgage insurance', -r.monthlyMortgageInsuranceUSD],
      ['Property taxes', -r.monthlyPropertyTaxesUSD],
      ['Home insurance', -r.monthlyInsuranceUSD],
      ['HOA', -r.monthlyHoaUSD],
      ['Owner-paid utilities', -r.monthlyUtilitiesUSD],
      ['Operating expenses', -r.monthlyOperatingExpensesUSD],
      ['Capital reserve', -r.monthlyCapitalExpendituresUSD],
      ['Net cash flow', r.monthlyCashFlowUSD],
    ] as const;
  });
  protected readonly cashLabels = computed(() => this.cashFlow().map(([label]) => label));
  protected readonly cashSeries = computed(() => [{ label: 'USD per month', values: this.cashFlow().map(([, value]) => value) }]);
  protected readonly equityLabels = computed(() => this.operating()?.equity.map(({ year }) => String(year)) ?? []);
  protected readonly equitySeries = computed(() => {
    const equity = this.operating()?.equity ?? [];
    return [
      { label: 'Principal paydown', values: equity.map((year) => year.principalEquityGainUSD) },
      { label: 'Appreciation', values: equity.map((year) => year.appreciationEquityGainUSD) },
    ];
  });
}
