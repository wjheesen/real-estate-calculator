import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BrowserBackupFiles } from './core/export/browser-backup-files';
import { DataTransferService } from './core/export/data-transfer.service';
import { SettingsStore } from './core/state/settings.store';
import type { SettingsDialogResult } from './features/settings/settings-dialog.component';
import type { ThemePreference } from './models/planner-settings';
import {
  ExportOptionsDialogComponent, type ExportOptionsDialogResult,
} from './shared/components/dialogs/export-options-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly settingsStore = inject(SettingsStore);
  private readonly transfer = inject(DataTransferService);
  private readonly files = inject(BrowserBackupFiles);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly system = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemTheme = signal<ThemePreference>(this.system.matches ? 'dark' : 'light');
  private readonly savingTheme = signal(false);
  private openingSettings = false;

  protected readonly settingsLoading = signal(true);
  protected readonly backupBusy = signal(false);
  protected readonly backupError = signal('');
  protected readonly refreshRequired = this.transfer.refreshRequired;
  protected readonly backupBlocked = computed(() =>
    this.settingsLoading() || this.backupBusy() || this.refreshRequired());
  protected readonly theme = computed(() => {
    const mode = this.settingsStore.settings().themeMode;
    return mode === 'system' ? this.systemTheme() : mode;
  });
  protected readonly themeBusy = computed(() => this.backupBlocked() || this.savingTheme());
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
    if (this.backupBlocked() || this.openingSettings) return;

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

  protected async exportBackup(): Promise<void> {
    if (this.backupBlocked()) return;
    await this.backupAction(async () => {
      const ref = this.dialog.open<ExportOptionsDialogComponent, undefined, ExportOptionsDialogResult>(
        ExportOptionsDialogComponent,
      );
      const options = await firstValueFrom(ref.afterClosed());
      if (!options) return;

      const now = new Date();
      const bytes = await this.transfer.export(options.includeCalculatedFigures, now);
      this.files.downloadZip(bytes, now);
      this.snackBar.open('Backup ready. Download started.', 'Dismiss', { duration: 3500 });
    });
  }

  protected async importBackup(): Promise<void> {
    if (this.backupBlocked()) return;
    await this.backupAction(async () => {
      const { ImportBackupDialogComponent } = await import('./features/backup/import-backup-dialog.component');
      const ref = this.dialog.open<InstanceType<typeof ImportBackupDialogComponent>, undefined, File>(
        ImportBackupDialogComponent, { width: '28rem', maxWidth: 'calc(100vw - 2rem)' },
      );
      const file = await firstValueFrom(ref.afterClosed());
      if (!file) return;

      await this.transfer.restore(() => file.arrayBuffer());
      this.snackBar.open('Backup restored.', 'Dismiss', { duration: 3500 });
    });
  }

  protected refreshBackup(): Promise<void> {
    return this.backupAction(async () => {
      await this.transfer.refresh();
      this.snackBar.open('Imported data refreshed.', 'Dismiss', { duration: 3500 });
    });
  }

  private async backupAction(run: () => Promise<void>): Promise<void> {
    if (this.backupBusy()) return;
    this.backupBusy.set(true);
    this.backupError.set('');
    try {
      await run();
    } catch (error) {
      this.backupError.set(error instanceof Error ? error.message : 'Could not complete the backup operation.');
    } finally {
      this.backupBusy.set(false);
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
