import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortfolioStore } from '../../core/state/portfolio.store';
import { SettingsStore } from '../../core/state/settings.store';
import type { PlannerProperty } from '../../models/planner-records';
import type { PropertyInputs } from '../../models/property-inputs';
import {
  ConfirmDialogComponent, type ConfirmDialogData,
} from '../../shared/components/dialogs/confirm-dialog.component';
import {
  InputDialogComponent, type InputDialogData, type InputDialogResult,
} from '../../shared/components/dialogs/input-dialog.component';
import { KpiStripComponent } from '../../shared/components/kpi-strip/kpi-strip.component';
import {
  activeCalculatorInputs, calculatorDraftForm, calculatorDraftFromRecord, newCalculatorDraft,
  purchasePmiDisabled, type CalculatorDraftValues, type OwnershipStatus,
} from './calculator-draft';
import { calculatorTiles } from './calculator-formatting';
import { PropertyInputsFormComponent } from './components/property-inputs-form/property-inputs-form.component';
import { calculatePropertyResults } from './real-estate-calculator';
import type { PropertyField } from './property-validation';

function parseId(value: string | null): number | undefined {
  if (value === null || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

@Component({
  imports: [
    KpiStripComponent, MatButtonModule, MatFormFieldModule, MatSelectModule, MatTabsModule,
    PropertyInputsFormComponent, ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculator-page.component.html',
  styleUrl: './calculator-page.component.css',
})
export class CalculatorPageComponent {
  private readonly portfolioStore = inject(PortfolioStore);
  private readonly settingsStore = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private readonly modeDrafts = new Map<OwnershipStatus, CalculatorDraftValues>();
  private queryVersion = 0;
  private destroyed = false;

  protected readonly initial = signal(newCalculatorDraft(this.settingsStore.settings()));
  protected readonly draft = signal(this.initial());
  protected readonly form = calculatorDraftForm(this.initial());
  protected readonly savedProperty = signal<PlannerProperty | undefined>(undefined);
  protected readonly portfolios = this.portfolioStore.portfolios;
  protected readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly saving = signal(false);
  protected readonly creatingPortfolio = signal(false);
  protected readonly error = signal('');
  protected readonly routeMessage = signal('');
  protected readonly notice = signal('');
  protected readonly tab = signal(0);
  protected readonly preview = computed(() => calculatePropertyResults(activeCalculatorInputs(this.draft())));
  protected readonly operating = computed(() => {
    const preview = this.preview();
    return preview.kind === 'operating' ? preview : undefined;
  });
  protected readonly tiles = computed(() => {
    const preview = this.preview();
    return preview.kind === 'invalid' ? [] : calculatorTiles(preview);
  });
  protected readonly dirty = computed(() => JSON.stringify(this.draft()) !== JSON.stringify(this.initial()));
  protected readonly canSave = computed(() => {
    const draft = this.draft();
    return this.loadState() === 'ready' && !this.saving() && !this.creatingPortfolio()
      && this.preview().kind !== 'invalid' && draft.name.trim() !== ''
      && this.portfolios().some((portfolio) => portfolio.id === draft.portfolioId);
  });

  constructor() {
    this.destroy.onDestroy(() => { this.destroyed = true; });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.notice.set('');
      this.syncDraft();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => void this.load(params));
  }

  protected async load(params: ParamMap = this.route.snapshot.queryParamMap): Promise<void> {
    const version = ++this.queryVersion;
    this.loadState.set('loading');
    this.routeMessage.set('');
    this.error.set('');
    this.notice.set('');
    try {
      const [records] = await Promise.all([this.portfolioStore.load(), this.settingsStore.load()]);
      if (version !== this.queryVersion || this.destroyed) return;

      const settings = this.settingsStore.settings();
      let initial = newCalculatorDraft(settings);
      let saved: PlannerProperty | undefined;
      if (params.has('id') && params.has('duplicate')) {
        this.routeMessage.set('Choose either a saved property or a property to duplicate.');
      } else if (params.has('id') || params.has('duplicate')) {
        const duplicate = params.has('duplicate');
        const id = parseId(params.get(duplicate ? 'duplicate' : 'id'));
        const from = records.properties.find((property) => property.id === id);
        if (from) {
          initial = calculatorDraftFromRecord(settings, from);
          if (duplicate) {
            initial.name = params.get('name')?.trim() || `${from.name} (Copy)`;
          } else {
            saved = from;
          }
        } else {
          this.routeMessage.set('That property could not be found. A new calculation is open.');
        }
      } else if (params.has('portfolioId')) {
        const id = parseId(params.get('portfolioId'));
        if (id !== undefined && records.portfolios.some((portfolio) => portfolio.id === id)) {
          initial.portfolioId = id;
        } else {
          this.routeMessage.set('That portfolio could not be found. Select a portfolio when you save.');
        }
      }

      this.setInitial(initial, saved);
      this.loadState.set('ready');
    } catch {
      if (version === this.queryVersion && !this.destroyed) this.loadState.set('error');
    }
  }

  protected changeOwnership(next: OwnershipStatus): void {
    const current = this.draft();
    if (current.ownershipStatus === next) return;
    this.modeDrafts.set(current.ownershipStatus, current);
    const target = this.modeDrafts.get(next) ?? newCalculatorDraft(this.settingsStore.settings(), next);
    this.replaceDraft({
      ...target, name: current.name, description: current.description, portfolioId: current.portfolioId,
    });
    this.notice.set('');
  }

  protected discard(): void {
    this.modeDrafts.clear();
    this.replaceDraft(this.initial());
    this.error.set('');
    this.notice.set('Changes discarded.');
  }

  protected async startNew(): Promise<void> {
    if (this.dirty()) {
      const confirmed = await firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(
        ConfirmDialogComponent, {
          data: { title: 'Start a new calculation?', message: 'Discard the current draft and start over?',
            confirmLabel: 'Start new calculation' },
        },
      ).afterClosed());
      if (confirmed !== true) return;
    }
    this.error.set('');
    this.notice.set('');
    this.routeMessage.set('');
    this.setInitial(newCalculatorDraft(this.settingsStore.settings()));
    this.tab.set(0);
    await this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  protected async createPortfolio(): Promise<void> {
    if (this.creatingPortfolio() || this.saving()) return;
    const result = await firstValueFrom(
      this.dialog.open<InputDialogComponent, InputDialogData, InputDialogResult>(InputDialogComponent, {
        data: {
          title: 'New portfolio',
          submitLabel: 'Create portfolio',
          existingNames: this.portfolios().map((portfolio) => portfolio.name),
        },
      }).afterClosed(),
    );
    if (!result) return;

    this.creatingPortfolio.set(true);
    this.error.set('');
    try {
      const id = await this.portfolioStore.createPortfolio(result.name, result.description);
      if (!this.destroyed) this.form.controls.portfolioId.setValue(id);
    } catch {
      this.error.set('Could not create the portfolio. Your property draft is still here.');
    } finally {
      this.creatingPortfolio.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    const draft = this.draft();
    const id = this.savedProperty()?.id;
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.portfolioStore.saveProperty({
        ...(activeCalculatorInputs(draft) as PropertyInputs),
        id,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        portfolioId: draft.portfolioId!,
      });
      if (this.destroyed) return;

      this.setInitial(calculatorDraftFromRecord(this.settingsStore.settings(), saved), saved);
      await this.router.navigate([], { relativeTo: this.route, queryParams: { id: saved.id }, replaceUrl: true });
      if (!this.destroyed) this.notice.set('Property saved.');
    } catch {
      this.error.set('Could not save the property. Your draft is still here. Try saving again.');
    } finally {
      this.saving.set(false);
    }
  }

  private setInitial(values: CalculatorDraftValues, saved?: PlannerProperty): void {
    this.modeDrafts.clear();
    this.initial.set(values);
    this.savedProperty.set(saved);
    this.replaceDraft(values);
  }

  private replaceDraft(values: CalculatorDraftValues): void {
    this.form.reset(values, { emitEvent: false });
    this.syncDraft();
  }

  private syncDraft(): void {
    const draft = this.form.getRawValue();
    this.draft.set(draft);
    const mortgageInsurance = this.form.controls.mortgageInsurance;
    if (purchasePmiDisabled(draft) && mortgageInsurance.enabled) mortgageInsurance.disable({ emitEvent: false });
    if (!purchasePmiDisabled(draft) && mortgageInsurance.disabled) mortgageInsurance.enable({ emitEvent: false });

    const result = this.preview();
    const errors = result.kind === 'invalid' ? result.errors : {};
    for (const [key, control] of Object.entries(this.form.controls)) {
      const error = errors[key as PropertyField];
      control.setErrors(error ? { propertyInput: error } : null, { emitEvent: false });
    }
  }
}
