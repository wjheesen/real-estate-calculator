import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import {
  BarController, BarElement, CategoryScale, Chart, Legend, LinearScale,
  LineController, LineElement, PointElement, Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip);

export interface ChartSeries {
  readonly label: string;
  readonly values: readonly (number | null)[];
}

const colors = {
  light: { primary: '#245fac', secondary: '#854c9e', positive: '#176d46', negative: '#a1263d' },
  dark: { primary: '#aac7ff', secondary: '#e8b6f8', positive: '#8ee1ac', negative: '#f78ba0' },
};

@Component({
  selector: 'app-cartesian-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cartesian-chart.component.html',
  styleUrl: './cartesian-chart.component.css',
})
export class CartesianChartComponent {
  readonly kind = input.required<'bar' | 'line'>();
  readonly title = input.required<string>();
  readonly labels = input.required<readonly string[]>();
  readonly series = input.required<readonly ChartSeries[]>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    const theme = signal<'light' | 'dark'>(root.dataset['theme'] === 'dark' ? 'dark' : 'light');
    const observer = new MutationObserver(() => theme.set(root.dataset['theme'] === 'dark' ? 'dark' : 'light'));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    inject(DestroyRef).onDestroy(() => observer.disconnect());

    effect((onCleanup) => {
      const canvas = this.canvas()?.nativeElement;
      if (!canvas) return;
      const palette = colors[theme()];
      const style = getComputedStyle(canvas);
      const kind = this.kind();
      const seriesData = this.series();
      const singleBar = kind === 'bar' && seriesData.length === 1;
      const chart = new Chart<'bar' | 'line'>(canvas, {
        type: kind,
        data: {
          labels: [...this.labels()],
          datasets: seriesData.map((series, index) => ({
            label: series.label,
            data: [...series.values],
            borderColor: index === 0 ? palette.primary : palette.secondary,
            backgroundColor: singleBar
              ? series.values.map((value) => value !== null && value < 0 ? palette.negative : palette.positive)
              : index === 0 ? palette.primary : palette.secondary,
            pointRadius: 2,
          })),
        },
        options: {
          indexAxis: kind === 'bar' ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          color: style.color,
          scales: {
            x: { ticks: { color: style.color }, grid: { color: style.borderTopColor } },
            y: { ticks: { color: style.color }, grid: { color: style.borderTopColor } },
          },
          plugins: { legend: { display: !singleBar, labels: { color: style.color } } },
        },
      });
      onCleanup(() => chart.destroy());
    });
  }
}
