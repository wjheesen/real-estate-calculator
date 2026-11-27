import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPercentage, formatUsd } from '../../calculator-formatting';
import type { PropertyResults } from '../../real-estate-calculator';

@Component({
  selector: 'app-schedule-e-tax-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule-e-tax-tab.component.html',
  styleUrl: './schedule-e-tax-tab.component.css',
})
export class ScheduleETaxTabComponent {
  readonly result = input.required<PropertyResults>();
  protected readonly figures = computed(() => {
    const result = this.result();
    if (result.kind === 'sale') return [];
    const r = result.tax;
    return [
      { label: 'Annual rental income', value: formatUsd(r.annualRentalIncomeUSD) },
      { label: 'Building-only depreciable basis', value: formatUsd(r.buildingBasisUSD) },
      { label: 'Rental allocation', value: formatPercentage(r.rentalUsePercentage) },
      { label: 'Allocated operating deductions', value: formatUsd(r.allocatedOperatingCostsUSD) },
      { label: 'Allocated Year 1 mortgage interest', value: formatUsd(r.allocatedYearOneInterestUSD) },
      { label: 'Annual pre-tax income', value: formatUsd(r.annualPretaxIncomeUSD) },
      { label: 'Annual straight-line depreciation', value: formatUsd(r.annualDepreciationUSD) },
      { label: 'Estimated annual taxable income', value: formatUsd(r.annualTaxableIncomeUSD) },
    ];
  });
}
