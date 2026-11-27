import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, from, of, switchMap } from 'rxjs';
import { PlannerDbService } from '../services/planner-db.service';

@Component({
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="page">
      @let result = portfolio();
      @if (result === 'error') {
        <h1>Portfolio</h1>
        <p class="deficit" role="alert">Could not load this portfolio.</p>
      } @else if (result === null) {
        <h1>Portfolio</h1>
        <p>Portfolio not found.</p>
      } @else if (result) {
        <h1>{{ result.name }}</h1>
        <p>Property management is coming in a later update.</p>
      } @else {
        <h1>Portfolio</h1>
        <p>Loading portfolio…</p>
      }
      <a mat-button routerLink="/portfolios">All portfolios</a>
    </section>
  `,
  styles: `
    a {
      margin-top: 1rem;
      min-height: 2.75rem;
    }
  `,
})
export class PortfolioPage {
  private readonly db = inject(PlannerDbService);

  protected readonly portfolio = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        return Number.isSafeInteger(id) && id > 0
          ? from(this.db.getPortfolio(id).then((portfolio) => portfolio ?? null)).pipe(
              catchError(() => of('error' as const)),
            )
          : of(null);
      }),
    ),
  );
}
