import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';
import { BudgetStore } from '../../core/state/budget.store';
import { PlannerOperations } from '../../core/state/planner-operations';
import { SettingsStore } from '../../core/state/settings.store';
import type { BudgetInputs, PlannerBudget } from '../../models/planner-records';
import { isValidSetting } from '../../models/planner-settings';
import {
  DoughnutChartComponent, type DoughnutSlice,
} from '../../shared/components/charts/doughnut-chart/doughnut-chart.component';
import {
  ConfirmDialogComponent, type ConfirmDialogData,
} from '../../shared/components/dialogs/confirm-dialog.component';
import { KpiStripComponent, type KpiTile } from '../../shared/components/kpi-strip/kpi-strip.component';
import { ReorderableListComponent } from '../../shared/components/reorderable-list/reorderable-list.component';
import type { LineItem } from '../../shared/utils/list-helpers';
import { calculateBudget, emptyBudget, isNonNegativeAmount, type BudgetListName } from './budget-calculator';

const livingLists = [
  { key: 'monthlyExpenses', title: 'Monthly living expenses', suffix: '$/month', placeholder: 'e.g. Groceries' },
  { key: 'annualExpenses', title: 'Annual living expenses', suffix: '$/year', placeholder: 'e.g. Car insurance' },
] as const;
const housingLists = [
  { key: 'monthlyHousingExpenses', title: 'Monthly benchmark costs', suffix: '$/month', placeholder: 'e.g. Utilities' },
  { key: 'annualHousingExpenses', title: 'Annual benchmark costs', suffix: '$/year', placeholder: 'e.g. Property tax' },
] as const;

@Component({
  imports: [
    CurrencyPipe, DoughnutChartComponent, KpiStripComponent, MatButtonModule, MatButtonToggleModule,
    MatFormFieldModule, MatInputModule, MatTabsModule, NgTemplateOutlet, ReactiveFormsModule,
    ReorderableListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-page.html',
  styleUrl: './budget-page.css',
})
export class BudgetPage {
  private readonly store = inject(BudgetStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly dialog = inject(MatDialog);
  private readonly currency = new CurrencyPipe('en-US');
  private readonly draftState = signal<BudgetInputs>(emptyBudget(this.settingsStore.settings()));
  private revision = 0;

  protected readonly draft = this.draftState.asReadonly();
  protected readonly saved = this.store.saved;
  protected readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly saving = signal(false);
  protected readonly clearing = signal(false);
  protected readonly invalid = signal(false);
  protected readonly error = signal('');
  protected readonly editorVersion = signal(0);
  protected readonly livingLists = livingLists;
  protected readonly housingLists = housingLists;
  protected readonly results = computed(() => calculateBudget(this.draft()));
  protected readonly tiles = computed<readonly KpiTile[]>(() => {
    const values = this.results();
    const budget = this.draft();
    return [
      { label: 'Net Monthly Income', value: this.money(values.monthlyNet),
        subtitle: `${this.money(values.annualNet)} / year`, tone: values.monthlyNet < 0 ? 'negative' : 'neutral' },
      { label: 'Non-Housing Living Expenses', value: this.money(values.monthlyLiving),
        subtitle: `${this.money(values.annualLiving)} / year`, tone: 'neutral' },
      { label: 'Available for Housing', value: this.money(values.monthlyAvailable),
        subtitle: 'Monthly amount for portfolio comparisons',
        tone: values.monthlyAvailable < 0 ? 'negative' : 'positive', highlight: true },
      { label: 'Single-Home Mortgage Benchmark', value: this.money(values.maximumLoan),
        subtitle: `${this.money(values.monthlyMortgage)} / month at ${budget.anticipatedMortgageRate}% over ${budget.anticipatedMortgageTermYears} years`,
        tone: 'primary' },
    ];
  });
  protected readonly chart = computed<readonly DoughnutSlice[]>(() => {
    const values = this.results();
    return [
      { label: 'Pay deductions', amount: values.monthlyDeductions, color: '#9766b9' },
      { label: 'Living expenses', amount: values.monthlyLiving, color: '#3882c4' },
      { label: 'Available for housing', amount: Math.max(0, values.monthlyAvailable), color: '#238661' },
    ];
  });
  protected readonly form = new FormGroup({
    grossIncome: new FormControl<number | null>(null, (control) =>
      isNonNegativeAmount(control.value) ? null : { invalidIncome: true }),
    useTwoWeekPayStub: new FormControl(false, { nonNullable: true }),
    anticipatedMortgageRate: new FormControl<number | null>(null, (control) =>
      isValidSetting('interestRate', control.value) ? null : { invalidRate: true }),
    anticipatedMortgageTermYears: new FormControl<number | null>(null, (control) =>
      isValidSetting('termInYears', control.value) ? null : { invalidTerm: true }),
  });

  constructor() {
    inject(PlannerOperations).replaced$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.setSavedDraft(this.saved());
      this.editorVersion.update((version) => version + 1);
      this.error.set('');
      this.loadState.set('ready');
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const values = this.form.getRawValue();
      this.invalid.set(this.form.invalid);
      this.draftState.update((prior) => ({
        ...prior,
        grossIncome: isNonNegativeAmount(values.grossIncome) ? values.grossIncome : prior.grossIncome,
        useTwoWeekPayStub: values.useTwoWeekPayStub,
        anticipatedMortgageRate: isValidSetting('interestRate', values.anticipatedMortgageRate)
          ? values.anticipatedMortgageRate : prior.anticipatedMortgageRate,
        anticipatedMortgageTermYears: isValidSetting('termInYears', values.anticipatedMortgageTermYears)
          ? values.anticipatedMortgageTermYears : prior.anticipatedMortgageTermYears,
      }));
      void this.save();
    });

    void this.load();
  }

  protected async load(): Promise<void> {
    this.loadState.set('loading');
    try {
      const [record] = await Promise.all([this.store.load(), this.settingsStore.load()]);
      this.setSavedDraft(record);
      this.loadState.set('ready');
    } catch {
      this.loadState.set('error');
    }
  }

  protected listItems(key: BudgetListName): readonly LineItem[] {
    return this.draft()[key];
  }

  protected setList(key: BudgetListName, items: readonly LineItem[]): void {
    this.draftState.update((budget) => ({ ...budget, [key]: items }));
    void this.save();
  }

  protected add(key: BudgetListName, item: LineItem): void {
    this.setList(key, [...this.draft()[key], item]);
  }

  protected update(key: BudgetListName, item: LineItem): void {
    this.setList(key, this.draft()[key].map((current) => current.id === item.id ? item : current));
  }

  protected remove(key: BudgetListName, id: number): void {
    this.setList(key, this.draft()[key].filter((item) => item.id !== id));
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.clearing() || this.loadState() !== 'ready') return;
    const revision = ++this.revision;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.store.save(this.draft());
    } catch {
      if (this.revision === revision) {
        this.error.set('Budget changes are unsaved. Try saving again.');
      }
    } finally {
      if (this.revision === revision) this.saving.set(false);
    }
  }

  protected async clear(): Promise<void> {
    if (this.clearing()) return;
    const confirmed = await firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(
      ConfirmDialogComponent, {
        data: {
          title: 'Clear budget?',
          message: 'Remove saved income, expenses, and benchmark costs from this device.',
          confirmLabel: 'Clear budget',
        },
      },
    ).afterClosed());
    if (confirmed !== true) return;

    this.clearing.set(true);
    ++this.revision;
    this.saving.set(false);
    this.error.set('');
    try {
      await this.store.clear();
      this.setDraft(emptyBudget(this.settingsStore.settings()));
      this.editorVersion.update((version) => version + 1);
    } catch {
      this.error.set('Could not clear the budget. Your entries are still here.');
    } finally {
      this.clearing.set(false);
    }
  }

  private setSavedDraft(record: PlannerBudget | null): void {
    if (record) {
      const { key, createdAt, updatedAt, ...inputs } = record;
      this.setDraft(inputs);
    } else {
      this.setDraft(emptyBudget(this.settingsStore.settings()));
    }
  }

  private setDraft(inputs: BudgetInputs): void {
    this.draftState.set(inputs);
    const { grossIncome, useTwoWeekPayStub, anticipatedMortgageRate, anticipatedMortgageTermYears } = inputs;
    this.form.reset({
      grossIncome, useTwoWeekPayStub, anticipatedMortgageRate, anticipatedMortgageTermYears,
    }, { emitEvent: false });
    this.invalid.set(false);
  }

  private money(value: number): string {
    return this.currency.transform(value, 'USD') ?? '';
  }
}
