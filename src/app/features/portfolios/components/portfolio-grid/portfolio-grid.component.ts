import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BudgetStore } from '../../../../core/state/budget.store';
import { PortfolioStore } from '../../../../core/state/portfolio.store';
import type { PlannerPortfolio } from '../../../../models/planner-records';
import {
  ConfirmDialogComponent, type ConfirmDialogData,
} from '../../../../shared/components/dialogs/confirm-dialog.component';
import { openPortfolioNameDialog } from '../../portfolio-name-dialog';
import { budgetFitLabel, signedUsd } from '../../portfolio-formatting';

@Component({
  imports: [MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-grid.component.html',
  styleUrl: './portfolio-grid.component.css',
})
export class PortfolioGridComponent {
  private readonly store = inject(PortfolioStore);
  private readonly budget = inject(BudgetStore);
  private readonly dialog = inject(MatDialog);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly portfolios = this.store.portfolios;
  protected readonly cards = computed(() => {
    const summaries = this.store.summaries();
    return this.portfolios().map((portfolio) => ({ portfolio, summary: summaries.get(portfolio.id)! }));
  });
  protected readonly signed = signedUsd;
  protected readonly fitLabel = budgetFitLabel;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      await Promise.all([this.store.load(), this.budget.load()]);
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  protected edit(portfolio?: PlannerPortfolio): Promise<void> {
    return this.action(async () => {
      const input = await openPortfolioNameDialog(this.dialog, this.portfolios(), portfolio);
      if (!input) return;

      if (portfolio) {
        await this.store.renamePortfolio(portfolio.id, input.name, input.description ?? null);
        this.notice.set('Portfolio renamed.');
      } else {
        await this.store.createPortfolio(input.name, input.description);
        this.notice.set('Portfolio created.');
      }
    });
  }

  protected duplicate(portfolio: PlannerPortfolio): Promise<void> {
    return this.action(async () => {
      await this.store.duplicatePortfolio(portfolio.id);
      this.notice.set('Portfolio duplicated.');
    });
  }

  protected remove(portfolio: PlannerPortfolio): Promise<void> {
    return this.action(async () => {
      const destination = await this.store.getDeleteDestination(portfolio.id);
      const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
        data: {
          title: 'Delete portfolio?',
          message: `Properties in “${portfolio.name}” will move to “${destination.name}”.`,
          confirmLabel: 'Delete portfolio',
        },
      });
      if (await firstValueFrom(ref.afterClosed()) !== true) return;

      await this.store.deletePortfolio(portfolio.id, destination.id);
      this.notice.set('Portfolio deleted.');
    });
  }

  private async action(run: () => Promise<void>): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await run();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not update portfolios. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
