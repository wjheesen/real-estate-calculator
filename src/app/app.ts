import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { ThemePreference } from './models/planner-records';
import { PlannerDbService } from './services/planner-db.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly db = inject(PlannerDbService);
  private readonly document = inject(DOCUMENT);
  private readonly system = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemTheme = signal<ThemePreference>(this.system.matches ? 'dark' : 'light');
  private readonly storedTheme = signal<ThemePreference | undefined>(undefined);
  private readonly pendingTheme = signal<ThemePreference | undefined>(undefined);
  private readonly loading = signal(true);

  protected readonly theme = computed(
    () => this.pendingTheme() ?? this.storedTheme() ?? this.systemTheme(),
  );
  protected readonly themeBusy = computed(() => this.loading() || !!this.pendingTheme());
  protected readonly themeError = signal('');

  constructor() {
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      this.systemTheme.set(event.matches ? 'dark' : 'light');
    };
    this.system.addEventListener('change', updateSystemTheme);

    inject(DestroyRef).onDestroy(() => {
      this.system.removeEventListener('change', updateSystemTheme);
      this.document.documentElement.removeAttribute('data-theme');
    });
    effect(() => this.document.documentElement.setAttribute('data-theme', this.theme()));

    void this.restoreTheme();
  }

  protected async toggleTheme(): Promise<void> {
    if (this.themeBusy()) return;

    const choice = this.theme() === 'dark' ? 'light' : 'dark';
    this.themeError.set('');
    this.pendingTheme.set(choice);

    try {
      await this.db.setTheme(choice);
      this.storedTheme.set(choice);
    } catch {
      this.themeError.set('Could not save the theme. Please try again.');
    } finally {
      this.pendingTheme.set(undefined);
    }
  }

  private async restoreTheme(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      if (settings?.theme === 'light' || settings?.theme === 'dark') {
        this.storedTheme.set(settings.theme);
      }
    } catch {
      this.themeError.set('Could not load the saved theme.');
    } finally {
      this.loading.set(false);
    }
  }
}
