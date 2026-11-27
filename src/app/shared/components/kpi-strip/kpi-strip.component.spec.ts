import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type KpiTile, KpiStripComponent } from './kpi-strip.component';

describe('KpiStripComponent', () => {
  let fixture: ComponentFixture<KpiStripComponent>;
  let host: HTMLElement;
  const tiles: readonly KpiTile[] = [
    { label: 'Housing surplus', value: '+$285', tone: 'positive', highlight: true, subtitle: 'Monthly' },
    { label: 'Cash flow deficit', value: '−$120', tone: 'negative' },
    { label: 'Cash to close', value: '$20,000', tone: 'primary' },
    { label: 'Properties', value: '2', tone: 'neutral' },
  ];

  beforeEach(() => {
    fixture = TestBed.createComponent(KpiStripComponent);
    fixture.componentRef.setInput('tiles', tiles);
    fixture.detectChanges();
    host = fixture.nativeElement;
  });

  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('renders all labels and formatted signs in both shell themes', () => {
    const colors: string[] = [];
    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme);
      expect(Array.from(host.querySelectorAll('dt'), (node) => node.textContent))
        .toEqual(tiles.map((tile) => tile.label));
      expect(Array.from(host.querySelectorAll('.value'), (node) => node.textContent))
        .toEqual(tiles.map((tile) => tile.value));
      expect(host.querySelector('.highlight .subtitle')?.textContent).toBe('Monthly');
      const positive = getComputedStyle(host.querySelector('[data-tone="positive"] .value')!).color;
      const negative = getComputedStyle(host.querySelector('[data-tone="negative"] .value')!).color;
      expect(positive).not.toBe(negative);
      colors.push(positive, negative);
    }
    expect(colors[0]).not.toBe(colors[2]);
    expect(colors[1]).not.toBe(colors[3]);
  });

  it('wraps to two and then one column as the available width shrinks', () => {
    const grid = host.querySelector('.tiles')!;
    for (const [width, columns] of [[960, 4], [700, 2], [375, 1]]) {
      host.style.width = `${width}px`;
      expect(getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(columns);
      expect(grid.scrollWidth).toBe(grid.clientWidth);
    }
  });
});
