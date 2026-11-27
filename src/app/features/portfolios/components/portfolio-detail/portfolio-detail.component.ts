import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, fromEvent, map } from 'rxjs';
import { BudgetStore } from '../../../../core/state/budget.store';
import { PortfolioStore } from '../../../../core/state/portfolio.store';
import type { PlannerProperty } from '../../../../models/planner-records';
import {
  ConfirmDialogComponent, type ConfirmDialogData,
} from '../../../../shared/components/dialogs/confirm-dialog.component';
import {
  CopyPropertyDialogComponent, type CopyPropertyDialogData, type CopyPropertyDialogResult,
} from '../../../../shared/components/dialogs/copy-property-dialog.component';
import { parsePositiveId } from '../../../../shared/utils/record-id';
import { openPortfolioNameDialog } from '../../portfolio-name-dialog';
import { PortfolioComparisonComponent } from '../portfolio-comparison/portfolio-comparison.component';
import { PropertyCardComponent } from '../property-card/property-card.component';

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule, RouterLink,
    PortfolioComparisonComponent, PropertyCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-detail.component.html',
  styleUrl: './portfolio-detail.component.css',
})
export class PortfolioDetailComponent {
  private readonly store = inject(PortfolioStore);
  private readonly budget = inject(BudgetStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly routeId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => parsePositiveId(params.get('id')))));

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'redirecting'>('loading');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly comparisonId = signal<number | null>(null);
  protected readonly portfolio = computed(() => this.store.portfolios().find(({ id }) => id === this.routeId()));
  protected readonly others = computed(() => this.store.portfolios().filter(({ id }) => id !== this.routeId()));
  protected readonly properties = computed(() => this.store.properties().filter(({ portfolioId }) =>
    portfolioId === this.routeId()));
  protected readonly primary = computed(() => {
    const portfolio = this.portfolio();
    const summary = this.store.summaries().get(portfolio?.id ?? 0);
    return portfolio && summary ? { name: portfolio.name, summary } : undefined;
  });
  protected readonly secondary = computed(() => {
    const matched = this.others().find(({ id }) => id === this.comparisonId());
    const summary = this.store.summaries().get(matched?.id ?? 0);
    return matched && summary ? { name: matched.name, summary } : undefined;
  });

  constructor() {
    effect(() => {
      if (this.state() !== 'ready') return;
      if (!this.portfolio()) {
        this.state.set('redirecting');
        this.snackBar.open('That portfolio could not be found.', 'Dismiss', { duration: 4000 });
        void this.router.navigate(['/portfolios'], { replaceUrl: true });
      } else if (this.comparisonId() !== null && !this.secondary()) {
        this.comparisonId.set(null);
        this.notice.set('The comparison portfolio is no longer available.');
      }
    });
    const window = inject(DOCUMENT).defaultView;
    if (window) {
      fromEvent(window, 'focus').pipe(takeUntilDestroyed()).subscribe(() => {
        if (this.state() === 'ready' && !this.busy()) void this.load(false);
      });
    }
    void this.load();
  }

  protected async load(showLoading = true): Promise<void> {
    if (showLoading) this.state.set('loading');
    try {
      await Promise.all([this.store.load(), this.budget.load()]);
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected rename(): Promise<void> {
    return this.action(async () => {
      const portfolio = this.portfolio();
      if (!portfolio) return;
      const input = await openPortfolioNameDialog(this.dialog, this.store.portfolios(), portfolio);
      if (!input) return;

      await this.store.renamePortfolio(portfolio.id, input.name, input.description ?? null);
      this.notice.set('Portfolio renamed.');
    });
  }

  protected duplicatePortfolio(): Promise<void> {
    return this.action(async () => {
      const portfolio = this.portfolio();
      if (!portfolio) return;
      const id = await this.store.duplicatePortfolio(portfolio.id);
      this.comparisonId.set(null);
      await this.router.navigate(['/portfolio', id]);
      this.notice.set('Portfolio duplicated.');
    });
  }

  protected copy(property: PlannerProperty): Promise<void> {
    return this.action(async () => {
      const data: CopyPropertyDialogData = { portfolios: this.store.portfolios() };
      const ref = this.dialog.open<CopyPropertyDialogComponent, CopyPropertyDialogData, CopyPropertyDialogResult>(
        CopyPropertyDialogComponent, { data },
      );
      const choice = await firstValueFrom(ref.afterClosed());
      if (!choice) return;

      await this.store.copyPropertyToPortfolio(property.id, choice.portfolioId, choice.name);
      this.notice.set('Property copied.');
    });
  }

  protected duplicate(property: PlannerProperty): Promise<void> {
    return this.action(async () => {
      await this.store.copyPropertyToPortfolio(property.id, property.portfolioId, `${property.name} (Copy)`);
      this.notice.set('Property duplicated.');
    });
  }

  protected remove(property: PlannerProperty): Promise<void> {
    return this.action(async () => {
      const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: 'Delete property?', message: `Remove “${property.name}” from this portfolio?`,
          confirmLabel: 'Delete property',
        },
      });
      if (await firstValueFrom(ref.afterClosed()) !== true) return;

      await this.store.deleteProperty(property.id);
      this.notice.set('Property deleted.');
    });
  }

  private async action(run: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.notice.set('');
    this.error.set('');
    try {
      await run();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not update the portfolio. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
