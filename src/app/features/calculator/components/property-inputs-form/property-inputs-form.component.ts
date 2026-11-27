import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ErrorStateMatcher, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  type CalculatorDraftValues, type NumericDraftKey, type OwnershipStatus, calculatorDraftForm,
  convertAmount, monthlyRentForDraft, purchaseLoanAmount, purchasePmiDisabled,
} from '../../calculator-draft';
import type { OperatingResults } from '../../real-estate-calculator';

interface NumberField {
  readonly key: NumericDraftKey;
  readonly label: string;
  readonly unit?: string;
  readonly integer?: boolean;
}

type UnitControl =
  | 'usePercentageForDownPayment'
  | 'usePercentageForMortgageInsurance'
  | 'usePercentageForOpex'
  | 'usePercentageForCapex';
type UnitAmount = 'downPayment' | 'mortgageInsurance' | 'operatingExpenses' | 'capitalExpenditures';

@Component({
  selector: 'app-property-inputs-form',
  imports: [CurrencyPipe, NgTemplateOutlet, ReactiveFormsModule, MatButtonToggleModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule],
  providers: [{ provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './property-inputs-form.component.html',
  styleUrl: './property-inputs-form.component.css',
})
export class PropertyInputsFormComponent {
  readonly form = input.required<ReturnType<typeof calculatorDraftForm>>();
  readonly draft = input.required<CalculatorDraftValues>();
  readonly operating = input<OperatingResults>();
  readonly ownershipChanged = output<OwnershipStatus>();

  protected readonly isSale = computed(() => this.draft().ownershipStatus === 'selling');
  protected readonly isPurchase = computed(() => this.draft().ownershipStatus === 'to_be_purchased');
  protected readonly hasOwnedDebt = computed(() => (this.draft().existingLoanBalance ?? 0) > 0);
  protected readonly pmiDisabled = computed(() => purchasePmiDisabled(this.draft()));

  protected readonly valueLabel = computed(() => this.isSale()
    ? 'Estimated sale price' : this.isPurchase() ? 'Purchase price' : 'Current market value');
  protected readonly expenses: readonly NumberField[] = [
    { key: 'insuranceCost', label: 'Home insurance', unit: '$/year' },
    { key: 'propertyTaxes', label: 'Property taxes', unit: '$/year' },
    { key: 'monthlyHOA', label: 'HOA', unit: '$/month' },
    { key: 'monthlyUtilities', label: 'Owner-paid utilities', unit: '$/month' },
  ];
  protected readonly growthAndTax: readonly NumberField[] = [
    { key: 'appreciationRate', label: 'Annual appreciation', unit: '%' },
    { key: 'plannedHoldPeriodYears', label: 'Planned hold period', unit: 'years', integer: true },
    { key: 'sellingCostsPercentage', label: 'Selling costs', unit: '%' },
    { key: 'scheduleEDeductibleAmount', label: 'Building-only depreciable basis', unit: '$' },
    { key: 'rentalUsePercentage', label: 'Rental use', unit: '%' },
  ];

  protected numberControl(key: NumericDraftKey) {
    return this.form().controls[key];
  }

  protected unitValue(key: UnitControl): boolean {
    return this.draft()[key];
  }

  protected changeUnit(key: UnitAmount, unitKey: UnitControl, percentage: boolean): void {
    const draft = this.draft();
    if (draft[unitKey] === percentage) return;
    const base = key === 'downPayment' ? draft.purchasePrice ?? 0
      : key === 'mortgageInsurance' ? purchaseLoanAmount(draft) : monthlyRentForDraft(draft);
    const converted = convertAmount(draft[key], draft[unitKey], base);
    this.form().patchValue({ [key]: converted, [unitKey]: percentage });
    this.form().controls[key].markAsDirty();
  }
}
