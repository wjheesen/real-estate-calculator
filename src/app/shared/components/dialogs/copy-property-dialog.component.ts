import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface CopyPropertyDialogData {
  readonly portfolios: readonly { readonly id: number; readonly name: string }[];
}

export interface CopyPropertyDialogResult {
  readonly portfolioId: number;
  readonly name?: string;
}

@Component({
  selector: 'app-copy-property-dialog',
  imports: [
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './copy-property-dialog.component.html',
  styleUrl: './dialog.css',
})
export class CopyPropertyDialogComponent {
  protected readonly data = inject<CopyPropertyDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CopyPropertyDialogComponent, CopyPropertyDialogResult>>(MatDialogRef);

  protected readonly form = new FormGroup({
    portfolioId: new FormControl<number | null>(null, Validators.required),
    name: new FormControl('', { nonNullable: true }),
  });

  protected submit(): void {
    const { portfolioId, name } = this.form.getRawValue();
    if (portfolioId === null || !this.data.portfolios.some((portfolio) => portfolio.id === portfolioId)) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.ref.getState() !== MatDialogState.OPEN) return;

    const trimmedName = name.trim();
    this.ref.close({ portfolioId, ...(trimmedName && { name: trimmedName }) });
  }
}
