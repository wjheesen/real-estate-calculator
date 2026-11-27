import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface KpiTile {
  readonly label: string;
  readonly value: string;
  readonly subtitle?: string;
  readonly highlight?: boolean;
  readonly tone: 'neutral' | 'positive' | 'negative' | 'primary';
}

@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.css',
})
export class KpiStripComponent {
  readonly tiles = input.required<readonly KpiTile[]>();
}
