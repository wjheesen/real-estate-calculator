import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { PlannerDbService } from './services/planner-db.service';

describe('AppComponent', () => {
  let db: jasmine.SpyObj<PlannerDbService>;

  beforeEach(async () => {
    db = jasmine.createSpyObj<PlannerDbService>('PlannerDbService', ['getSettings', 'setTheme']);
    db.getSettings.and.resolveTo({ key: 'app-settings', theme: 'dark' });
    db.setTheme.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), { provide: PlannerDbService, useValue: db }],
    }).compileComponents();
  });

  it('renders the brand, primary navigation and disabled actions', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app: HTMLElement = fixture.nativeElement;
    expect(app.querySelector('.app-title')?.textContent).toBe('Real Estate Calculator');

    const links = Array.from(app.querySelectorAll('nav a'));
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Budget', '/budget'],
      ['Calculator', '/calculator'],
      ['Portfolios', '/portfolios'],
    ]);

    const disabled = Array.from(app.querySelectorAll('.app-actions button:disabled'));
    expect(disabled.map((button) => button.textContent?.trim())).toContain('Settings');
    expect(disabled.map((button) => button.textContent?.trim())).toContain('Import');
    expect(disabled.map((button) => button.textContent?.trim())).toContain('Export');
  });

  it('rolls back an unsuccessful theme change and announces the error', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    const app: HTMLElement = fixture.nativeElement;
    const toggle = app.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    let rejectSave!: (error: Error) => void;
    db.setTheme.and.callFake(() => new Promise((_, reject) => { rejectSave = reject; }));
    toggle.click();
    fixture.detectChanges();
    expect(db.setTheme).toHaveBeenCalledOnceWith('light');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    rejectSave(new Error('Write failed'));
    flushMicrotasks();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(app.querySelector('[role="alert"]')?.textContent).toContain('Could not save the theme.');
  }));
});
