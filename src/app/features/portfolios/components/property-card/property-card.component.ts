import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { PlannerProperty } from '../../../../models/planner-records';
import { formatUsd } from '../../../calculator/calculator-formatting';
import { calculatePropertyResults } from '../../../calculator/real-estate-calculator';
import { signedUsd } from '../../portfolio-formatting';

const statusLabels = {
  to_be_purchased: 'To be purchased',
  already_owned: 'Already owned',
  selling: 'Selling',
};

@Component({
  selector: 'app-property-card',
  imports: [MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './property-card.component.html',
  styleUrl: './property-card.component.css',
})
export class PropertyCardComponent {
  readonly property = input.required<PlannerProperty>();
  readonly busy = input(false);
  readonly copied = output<void>();
  readonly duplicated = output<void>();
  readonly deleted = output<void>();

  protected readonly status = computed(() => statusLabels[this.property().ownershipStatus]);
  protected readonly figures = computed(() => {
    const r = calculatePropertyResults(this.property());
    if (r.kind === 'invalid') return [];
    if (r.kind === 'sale') {
      return [
        { label: 'Sale price', value: formatUsd(r.salePriceUSD) },
        { label: 'Selling costs', value: formatUsd(r.sellingCostsUSD) },
        { label: 'Loan payoff', value: formatUsd(r.loanPayoffUSD) },
        { label: 'Signed net proceeds', value: signedUsd(r.netSaleProceedsUSD) },
      ];
    }
    return [
      { label: 'Property value', value: formatUsd(r.propertyValueUSD) },
      { label: 'Cash invested', value: formatUsd(r.totalCashInvestedUSD) },
      { label: 'Monthly cash flow', value: signedUsd(r.monthlyCashFlowUSD) },
      { label: `Average monthly equity gain over ${r.holdYears} years`, value: signedUsd(r.averageMonthlyEquityGainUSD) },
      { label: 'Yearly total return', value: signedUsd(r.yearlyTotalReturnUSD) },
    ];
  });
}
