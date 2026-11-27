import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { SettingsStore } from '../../core/state/settings.store';
import {
  calculationSettings, isValidSetting, settingBounds,
  type CalculationSetting, type PlannerPreferences, type ThemeMode,
} from '../../models/planner-settings';
import {
  ConfirmDialogComponent, type ConfirmDialogData,
} from '../../shared/components/dialogs/confirm-dialog.component';

export type SettingsDialogResult = 'saved' | 'reset';

interface SettingField {
  key: CalculationSetting;
  label: string;
  unit?: string;
}

interface SettingGroup {
  title: string;
  fields: readonly SettingField[];
}

@Component({
  selector: 'app-settings-dialog',
  imports: [
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.css',
})
export class SettingsDialogComponent {
  private readonly store = inject(SettingsStore);
  private readonly dialog = inject(MatDialog);
  private readonly ref = inject<MatDialogRef<SettingsDialogComponent, SettingsDialogResult>>(MatDialogRef);
  private readonly initial = this.store.settings();

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly bounds = settingBounds;
  protected readonly groups: readonly SettingGroup[] = [
    {
      title: 'Financing',
      fields: [
        { key: 'interestRate', label: 'Interest rate', unit: '%' },
        { key: 'downPaymentPercentage', label: 'Down payment', unit: '%' },
        { key: 'termInYears', label: 'Loan term', unit: 'years' },
        { key: 'paymentsPerYear', label: 'Payments per year' },
        { key: 'mortgageInsuranceRatePercentage', label: 'Mortgage insurance rate', unit: '%' },
      ],
    },
    {
      title: 'Operating costs',
      fields: [
        { key: 'operatingExpensesPercentage', label: 'Operating expenses', unit: '%' },
        { key: 'capitalExpendituresPercentage', label: 'Capital expenditures', unit: '%' },
        { key: 'defaultStrOccupancyPercentage', label: 'Short-term rental occupancy', unit: '%' },
      ],
    },
    {
      title: 'Growth and sale',
      fields: [
        { key: 'appreciationPercentage', label: 'Annual appreciation', unit: '%' },
        { key: 'plannedHoldPeriodYears', label: 'Planned hold period', unit: 'years' },
        { key: 'sellingCostsPercentage', label: 'Selling costs', unit: '%' },
      ],
    },
  ];
  protected readonly form = new FormGroup({
    ...(Object.fromEntries(calculationSettings.map((key) => [
      key,
      new FormControl<number | null>(this.initial[key], [
        Validators.required,
        (control) => isValidSetting(key, control.value) ? null : { invalidSetting: true },
      ]),
    ])) as Record<CalculationSetting, FormControl<number | null>>),
    themeMode: new FormControl<ThemeMode>(this.initial.themeMode, { nonNullable: true }),
  });

  protected async save(): Promise<void> {
    if (this.saving() || this.form.invalid) return;

    const patch: Partial<PlannerPreferences> = {};
    const values = this.form.getRawValue();
    for (const key of calculationSettings) {
      const value = values[key];
      if (value !== null && value !== this.initial[key]) patch[key] = value;
    }
    if (values.themeMode !== this.initial.themeMode) patch.themeMode = values.themeMode;
    await this.commit('saved', () => this.store.save(patch));
  }

  protected async reset(): Promise<void> {
    if (this.saving()) return;

    const confirmed = await firstValueFrom(
      this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: 'Reset settings?',
          message: 'Restore the original calculation defaults and use the system theme.',
          confirmLabel: 'Reset settings',
        },
      }).afterClosed(),
    );
    if (confirmed === true) await this.commit('reset', () => this.store.resetToDefaults());
  }

  private async commit(result: SettingsDialogResult, write: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.saving.set(true);
    this.ref.disableClose = true;
    this.form.disable();

    try {
      await write();
      this.ref.close(result);
    } catch {
      this.error.set('Could not save settings. Your changes are still here. Please try again.');
      this.form.enable();
      this.ref.disableClose = false;
      this.saving.set(false);
    }
  }
}
