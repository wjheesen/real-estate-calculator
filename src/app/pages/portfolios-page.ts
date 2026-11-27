import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { catchError, from, of } from 'rxjs';
import { PlannerDbService } from '../services/planner-db.service';

@Component({
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="page">
      <h1>Portfolios</h1>
      <p>View portfolios saved on this device.</p>

      <div class="page-surface">
        @let result = portfolios();
        @if (result === 'error') {
          <p class="deficit" role="alert">Could not load portfolios.</p>
        } @else if (result) {
          <ul class="portfolio-list" aria-label="Saved portfolios">
            @for (portfolio of result; track portfolio.id) {
              <li>
                <a mat-button [routerLink]="['/portfolio', portfolio.id]">{{ portfolio.name }}</a>
              </li>
            } @empty {
              <li>No portfolios saved.</li>
            }
          </ul>
        } @else {
          <p>Loading portfolios…</p>
        }
      </div>
    </section>
  `,
  styles: `
    .portfolio-list {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .portfolio-list a {
      min-height: 2.75rem;
    }
  `,
})
export class PortfoliosPage {
  protected readonly portfolios = toSignal(
    from(inject(PlannerDbService).getPortfolios()).pipe(catchError(() => of('error' as const))),
  );
}
