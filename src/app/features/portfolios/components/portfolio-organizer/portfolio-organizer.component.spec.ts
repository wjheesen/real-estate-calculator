import { CdkDrag, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BudgetStore } from '../../../../core/state/budget.store';
import { PortfolioStore } from '../../../../core/state/portfolio.store';
import type { PlannerPortfolio, PlannerProperty } from '../../../../models/planner-records';
import { aggregatePortfolio } from '../../portfolio-aggregator';
import { PortfolioOrganizerComponent } from './portfolio-organizer.component';

describe('PortfolioOrganizerComponent', () => {
  it('renders stable, named drop lists, a touch/mouse handle, and a keyboard move action', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const portfolios: PlannerPortfolio[] = ['Current', 'Elsewhere'].map((name, index) => ({
      id: index + 1, name, createdAt: now, updatedAt: now,
    }));
    const properties: PlannerProperty[] = [{
      id: 7, portfolioId: 1, name: 'Listed home', createdAt: now, updatedAt: now,
      ownershipStatus: 'selling', purchasePrice: 100000, existingLoanBalance: 0, sellingCostsPercentage: 6,
    }];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: BudgetStore, useValue: { load: async () => null } },
        {
          provide: PortfolioStore, useValue: {
            load: async () => ({ portfolios, properties }),
            portfolios: signal(portfolios),
            properties: signal(properties),
            summaries: signal(new Map(portfolios.map(({ id }) => [id, aggregatePortfolio(id, properties, null)]))),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PortfolioOrganizerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
    expect(lists.map((list) => list.injector.get(CdkDropList).data)).toEqual([1, 2]);
    expect(lists[1].nativeElement.getAttribute('aria-label')).toBe('Properties in Elsewhere');
    const card = fixture.debugElement.query(By.directive(CdkDrag));
    const drag = card.injector.get(CdkDrag);
    expect(drag.data).toBe(7);
    expect(drag.dragStartDelay).toEqual({ mouse: 0, touch: 150 });
    const handle = card.query(By.directive(CdkDragHandle)).nativeElement as HTMLElement;
    expect(getComputedStyle(handle).touchAction).toBe('none');
    expect(card.nativeElement.querySelector('button[aria-label="Move Listed home"]')).not.toBeNull();
  });
});
