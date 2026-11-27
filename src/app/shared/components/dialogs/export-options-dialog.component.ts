import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MatDialogState } from '@angular/material/dialog';

export interface ExportOptionsDialogResult {
  readonly includeCalculatedFigures: boolean;
}

@Component({
  selector: 'app-export-options-dialog',
  imports: [MatButtonModule, MatCheckboxModule, MatDialogModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-options-dialog.component.html',
  styleUrl: './dialog.css',
})
export class ExportOptionsDialogComponent {
  private readonly ref = inject<MatDialogRef<ExportOptionsDialogComponent, ExportOptionsDialogResult>>(MatDialogRef);

  protected readonly form = new FormGroup({
    includeCalculatedFigures: new FormControl(false, { nonNullable: true }),
  });

  protected submit(): void {
    if (this.ref.getState() === MatDialogState.OPEN) {
      this.ref.close(this.form.getRawValue());
    }
  }
}
