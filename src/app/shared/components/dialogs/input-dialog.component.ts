import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialogState } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface InputDialogData {
  readonly title: string;
  readonly initialName?: string;
  readonly initialDescription?: string;
  readonly existingNames?: readonly string[];
  readonly submitLabel?: string;
}

export interface InputDialogResult {
  readonly name: string;
  readonly description?: string;
}

@Component({
  selector: 'app-input-dialog',
  imports: [
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input-dialog.component.html',
  styleUrl: './dialog.css',
})
export class InputDialogComponent {
  protected readonly data = inject<InputDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<InputDialogComponent, InputDialogResult>>(MatDialogRef);

  protected readonly form = new FormGroup({
    name: new FormControl(this.data.initialName ?? '', {
      nonNullable: true,
      validators: (control) => {
        const name = control.value.trim().toLowerCase();
        if (!name) return { required: true };
        return this.data.existingNames?.some((existing) => existing.trim().toLowerCase() === name)
          ? { duplicate: true }
          : null;
      },
    }),
    description: new FormControl(this.data.initialDescription ?? '', { nonNullable: true }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.ref.getState() !== MatDialogState.OPEN) return;

    const { name, description } = this.form.getRawValue();
    const trimmedDescription = description.trim();
    this.ref.close({
      name: name.trim(),
      ...(trimmedDescription && { description: trimmedDescription }),
    });
  }
}
