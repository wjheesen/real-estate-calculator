import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsStore } from './core/state/settings.store';
import type { SettingsDialogResult } from './features/settings/settings-dialog.component';
import type { ThemePreference } from './models/planner-settings';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly settingsStore = inject(SettingsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly system = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemTheme = signal<ThemePreference>(this.system.matches ? 'dark' : 'light');
  private readonly savingTheme = signal(false);
  private openingSettings = false;

  protected readonly settingsLoading = signal(true);
  protected readonly theme = computed(() => {
    const mode = this.settingsStore.settings().themeMode;
    return mode === 'system' ? this.systemTheme() : mode;
  });
  protected readonly themeBusy = computed(() => this.settingsLoading() || this.savingTheme());
  protected readonly settingsError = signal('');

  constructor() {
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      this.systemTheme.set(event.matches ? 'dark' : 'light');
    };
    this.system.addEventListener('change', updateSystemTheme);
    this.destroyRef.onDestroy(() => {
      this.system.removeEventListener('change', updateSystemTheme);
      this.document.documentElement.removeAttribute('data-theme');
    });
    effect(() => this.document.documentElement.setAttribute('data-theme', this.theme()));

    void this.loadSettings();
  }

  protected async toggleTheme(): Promise<void> {
    if (this.themeBusy()) return;

    this.settingsError.set('');
    this.savingTheme.set(true);
    try {
      await this.settingsStore.save({ themeMode: this.theme() === 'dark' ? 'light' : 'dark' });
    } catch {
      this.settingsError.set('Could not save the theme. Please try again.');
    } finally {
      this.savingTheme.set(false);
    }
  }

  protected async openSettings(): Promise<void> {
    if (this.settingsLoading() || this.openingSettings) return;

    this.settingsError.set('');
    this.openingSettings = true;
    try {
      const { SettingsDialogComponent } = await import('./features/settings/settings-dialog.component');
      this.dialog.open<InstanceType<typeof SettingsDialogComponent>, undefined, SettingsDialogResult>(
        SettingsDialogComponent, { width: '42rem', maxWidth: 'calc(100vw - 2rem)' },
      ).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
        if (result) {
          this.snackBar.open(result === 'reset' ? 'Settings reset to defaults.' : 'Settings saved.',
            'Dismiss', { duration: 3500 });
        }
      });
    } catch {
      this.settingsError.set('Could not open settings. Please try again.');
    } finally {
      this.openingSettings = false;
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      await this.settingsStore.load();
    } catch {
      this.settingsError.set('Could not load the saved settings.');
    } finally {
      this.settingsLoading.set(false);
    }
  }
}
