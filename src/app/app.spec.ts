import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { signal } from '@angular/core';
import { SettingsStore } from './core/state/settings.store';
import { DEFAULT_PLANNER_SETTINGS, type PlannerPreferences } from './models/planner-settings';

describe('AppComponent', () => {
  let settingsStore: jasmine.SpyObj<SettingsStore>;

  beforeEach(async () => {
    const settings = signal<Readonly<PlannerPreferences>>({
      ...DEFAULT_PLANNER_SETTINGS, themeMode: 'dark',
    });
    settingsStore = jasmine.createSpyObj<SettingsStore>('SettingsStore', ['load', 'save'], {
      settings: settings.asReadonly(),
    });
    settingsStore.load.and.resolveTo();
    settingsStore.save.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), { provide: SettingsStore, useValue: settingsStore }],
    }).compileComponents();
  });

  it('renders the brand, primary navigation and backup actions', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const app: HTMLElement = fixture.nativeElement;
    expect(app.querySelector('.app-title')?.textContent).toBe('Real Estate Calculator');

    const links = Array.from(app.querySelectorAll('nav a'));
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Budget', '/budget'],
      ['Calculator', '/calculator'],
      ['Portfolios', '/portfolios'],
    ]);

    const actions = Array.from(app.querySelectorAll('.app-actions button:not(:disabled)'));
    expect(actions.map((button) => button.textContent?.trim())).toEqual([
      'Dark mode', 'Settings', 'Import', 'Export',
    ]);
  }));

  it('keeps the committed theme during a failed save and announces the error', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const app: HTMLElement = fixture.nativeElement;
    const toggle = app.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    let rejectSave!: (error: Error) => void;
    settingsStore.save.and.callFake(() => new Promise((_, reject) => { rejectSave = reject; }));
    toggle.click();
    fixture.detectChanges();
    expect(settingsStore.save).toHaveBeenCalledOnceWith({ themeMode: 'light' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    rejectSave(new Error('Write failed'));
    flushMicrotasks();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(app.querySelector('[role="alert"]')?.textContent).toContain('Could not save the theme.');
  }));
});
