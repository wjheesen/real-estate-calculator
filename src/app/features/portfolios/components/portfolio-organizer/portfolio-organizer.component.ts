import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { fromEvent } from 'rxjs';
import { BudgetStore } from '../../../../core/state/budget.store';
import { PortfolioStore } from '../../../../core/state/portfolio.store';
import type { PlannerProperty } from '../../../../models/planner-records';
import { parsePositiveId } from '../../../../shared/utils/record-id';
import { calculatePropertyResults } from '../../../calculator/real-estate-calculator';
import { budgetFitLabel, signedUsd } from '../../portfolio-formatting';
import { type PropertyDrop, type PropertyMove, propertyMoveFromDrop } from './property-move';

const statuses = {
  to_be_purchased: 'To be purchased',
  already_owned: 'Already owned',
  selling: 'Selling',
} as const;

function organizerFigure(property: PlannerProperty): string {
  const r = calculatePropertyResults(property);
  if (r.kind === 'invalid') return 'Calculation unavailable';
  return r.kind === 'sale' ? `${signedUsd(r.netSaleProceedsUSD)} net sale proceeds`
    : `${signedUsd(r.monthlyCashFlowUSD)} / month cash flow`;
}

@Component({
  imports: [DragDropModule, MatButtonModule, MatMenuModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-organizer.component.html',
  styleUrl: './portfolio-organizer.component.css',
})
export class PortfolioOrganizerComponent {
  private readonly store = inject(PortfolioStore);
  private readonly budget = inject(BudgetStore);
  private readonly fromId = parsePositiveId(inject(ActivatedRoute).snapshot.queryParamMap.get('from'));
  protected readonly portfolios = this.store.portfolios;
  protected readonly backTo = computed(() => this.portfolios().some(({ id }) => this.fromId === id)
    ? ['/portfolio', this.fromId] : ['/portfolios']);
  protected readonly columns = computed(() => {
    const summaries = this.store.summaries();
    const properties = this.store.properties();
    return this.portfolios().map((portfolio) => ({
      portfolio,
      summary: summaries.get(portfolio.id)!,
      properties: properties.filter(({ portfolioId }) => portfolioId === portfolio.id)
        .map((record) => ({ record, status: statuses[record.ownershipStatus], figure: organizerFigure(record) })),
    }));
  });
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly moving = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly failed = signal<PropertyMove | null>(null);
  protected readonly signed = signedUsd;
  protected readonly fit = budgetFitLabel;
  protected readonly dragDelay = { mouse: 0, touch: 150 };

  constructor() {
    const window = inject(DOCUMENT).defaultView;
    if (window) {
      fromEvent(window, 'focus').pipe(takeUntilDestroyed()).subscribe(() => {
        if (this.state() === 'ready' && !this.moving()) void this.load(false);
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

  protected drop(event: PropertyDrop): void {
    const move = propertyMoveFromDrop(event);
    if (move) void this.move(move);
  }

  protected async move(command: PropertyMove): Promise<void> {
    if (this.moving()) return;
    const property = this.store.properties().find(({ id }) => id === command.propertyId);
    if (property?.portfolioId === command.targetId) return;

    this.moving.set(true);
    this.notice.set('');
    this.error.set('');
    this.failed.set(null);
    try {
      const record = await this.store.movePropertyToPortfolio(command.propertyId, command.targetId);
      const actualParent = this.portfolios().find(({ id }) => id === record.portfolioId);
      this.notice.set(actualParent ? `Property moved to ${actualParent.name}.` : 'Property moved.');
    } catch (error) {
      this.failed.set(command);
      const message = error instanceof Error && error.message === 'Portfolio not found.'
        ? 'The target portfolio is no longer available.' : 'Could not move the property.';
      this.error.set(`${message} The saved assignment is unchanged.`);
    } finally {
      this.moving.set(false);
    }
  }
}
