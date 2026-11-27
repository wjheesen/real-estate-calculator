import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, from, map, of } from 'rxjs';
import { PlannerDbService } from '../services/planner-db.service';

@Component({
  template: `
    <section class="page">
      <h1>Budget</h1>

      <div class="page-surface">
        <h2>Saved budget</h2>
        @switch (status()) {
          @case ('configured') { <p>A budget is saved on this device.</p> }
          @case ('unconfigured') { <p>No budget has been set up.</p> }
          @case ('error') { <p class="deficit" role="alert">Could not load the budget.</p> }
          @default { <p>Loading budget…</p> }
        }
      </div>
    </section>
  `,
})
export class BudgetPage {
  protected readonly status = toSignal(
    from(inject(PlannerDbService).getBudget()).pipe(
      map((budget) => (budget ? 'configured' : 'unconfigured')),
      catchError(() => of('error')),
    ),
  );
}
