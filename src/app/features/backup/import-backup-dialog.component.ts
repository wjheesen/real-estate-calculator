import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BrowserBackupFiles } from '../../core/export/browser-backup-files';

@Component({
  imports: [MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-backup-dialog.component.html',
})
export class ImportBackupDialogComponent {
  private readonly files = inject(BrowserBackupFiles);
  private readonly ref = inject<MatDialogRef<ImportBackupDialogComponent, File>>(MatDialogRef);
  protected readonly choosing = signal(false);
  protected readonly error = signal('');

  protected async choose(): Promise<void> {
    if (this.choosing()) return;
    this.choosing.set(true);
    this.ref.disableClose = true;
    this.error.set('');
    try {
      const file = await this.files.chooseZip();
      this.ref.close(file);
    } catch {
      this.error.set('Could not open the file picker.');
      this.ref.disableClose = false;
      this.choosing.set(false);
    }
  }
}
