import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { ArcElement, Chart, DoughnutController } from 'chart.js';

Chart.register(DoughnutController, ArcElement);

export interface DoughnutSlice {
  readonly label: string;
  readonly amount: number;
  readonly color: string;
}

@Component({
  selector: 'app-doughnut-chart',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './doughnut-chart.component.html',
  styleUrl: './doughnut-chart.component.css',
})
export class DoughnutChartComponent {
  readonly slices = input.required<readonly DoughnutSlice[]>();
  readonly label = input.required<string>();
  protected readonly hasData = computed(() => this.slices().some((slice) => slice.amount > 0));
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect((onCleanup) => {
      const canvas = this.canvas()?.nativeElement;
      if (!canvas) return;
      const slices = this.slices();
      const chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: slices.map((slice) => slice.label),
          datasets: [{
            data: slices.map((slice) => slice.amount),
            backgroundColor: slices.map((slice) => slice.color),
            borderWidth: 0,
          }],
        },
        options: { animation: false, cutout: '65%', responsive: true },
      });
      onCleanup(() => chart.destroy());
    });
  }
}
