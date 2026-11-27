import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { signedUsd } from '../../../portfolios/portfolio-formatting';
import type { DraftPortfolioImpact } from '../../draft-portfolio-impact';

@Component({
  selector: 'app-draft-portfolio-impact-bar',
  imports: [MatButtonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './draft-portfolio-impact-bar.component.html',
  styleUrl: './draft-portfolio-impact-bar.component.css',
})
export class DraftPortfolioImpactBarComponent {
  readonly portfolioName = input.required<string>();
  readonly impact = input.required<DraftPortfolioImpact>();
  readonly dirty = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly canSave = input.required<boolean>();
  readonly save = output<void>();
  readonly discard = output<void>();

  protected readonly metrics = computed(() => {
    const impact = this.impact();
    return [
      { label: 'Monthly cash flow', ...impact.cashFlow },
      { label: 'Monthly Budget Fit', ...impact.budgetFit },
    ];
  });

  protected display(value: number | null): string {
    return value === null ? '—' : signedUsd(value);
  }
}
