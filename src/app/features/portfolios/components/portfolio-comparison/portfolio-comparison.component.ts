import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartesianChartComponent } from '../../../../shared/components/charts/cartesian-chart/cartesian-chart.component';
import type { PortfolioSummary } from '../../portfolio-aggregator';
import { comparisonRows } from '../../portfolio-comparison';
import { signedUsd } from '../../portfolio-formatting';

export interface NamedPortfolioSummary {
  readonly name: string;
  readonly summary: PortfolioSummary;
}

const labels = ['Monthly cash flow ($/mo)', 'Monthly Budget Fit ($/mo)', 'Upfront cash required ($)', 'Yearly total return ($/yr)'];

@Component({
  selector: 'app-portfolio-comparison',
  imports: [CartesianChartComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-comparison.component.html',
  styleUrl: './portfolio-comparison.component.css',
})
export class PortfolioComparisonComponent {
  readonly primary = input.required<NamedPortfolioSummary>();
  readonly secondary = input<NamedPortfolioSummary>();
  protected readonly rows = computed(() => comparisonRows(this.primary().summary, this.secondary()?.summary));
  protected readonly chartLabels = labels;
  protected readonly signed = signedUsd;
  protected readonly series = computed(() => {
    const second = this.secondary();
    if (!second) return [];
    return [this.primary(), second].map(({ name, summary }) => ({
      label: name,
      values: [
        summary.monthlyCashFlowUSD,
        summary.monthlyBudgetFitUSD,
        summary.netCashRequiredUSD,
        summary.yearlyTotalReturnUSD,
      ],
    }));
  });
}
