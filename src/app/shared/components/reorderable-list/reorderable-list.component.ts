import { DecimalPipe } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, output,
  signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { type LineItem, moveLineItem, nextLineItemId } from '../../utils/list-helpers';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../dialogs/confirm-dialog.component';

@Component({
  selector: 'app-reorderable-list',
  imports: [
    DecimalPipe, DragDropModule, MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reorderable-list.component.html',
  styleUrl: './reorderable-list.component.css',
})
export class ReorderableListComponent {
  readonly items = input.required<readonly LineItem[]>();
  readonly title = input.required<string>();
  readonly amountSuffix = input.required<string>();
  readonly emptyMessage = input('No items yet.');
  readonly namePlaceholder = input('');
  readonly confirmDelete = input(false);

  readonly itemAdded = output<LineItem>();
  readonly itemUpdated = output<LineItem>();
  readonly itemDeleted = output<number>();
  readonly itemsReordered = output<readonly LineItem[]>();

  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');
  private readonly editor = viewChild.required(FormGroupDirective);

  protected readonly editingId = signal<number | null>(null);
  protected readonly total = computed(() => this.items().reduce((sum, item) => sum + item.amount, 0));

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: (control) => control.value.trim() ? null : { required: true },
    }),
    amount: new FormControl<number | null>(null, (control) =>
      control.value !== null && Number.isFinite(control.value) && control.value >= 0
        ? null
        : { invalidAmount: true },
    ),
  });

  protected submit(): void {
    const { name, amount } = this.form.getRawValue();
    if (this.form.invalid || amount === null) {
      this.form.markAllAsTouched();
      return;
    }

    const fields = { name: name.trim(), amount };
    const id = this.editingId();
    const items = this.items();
    if (id === null) {
      this.itemAdded.emit({ id: nextLineItemId(items), ...fields });
    } else {
      const existing = items.find((item) => item.id === id);
      if (existing) {
        this.itemUpdated.emit({ ...existing, ...fields });
      }
    }
    this.cancelEdit();
  }

  protected edit(item: LineItem): void {
    this.editingId.set(item.id);
    this.editor().resetForm({ name: item.name, amount: item.amount });
    this.nameInput().nativeElement.focus();
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.editor().resetForm();
  }

  protected delete(item: LineItem): void {
    if (!this.confirmDelete()) {
      this.emitDelete(item.id);
      return;
    }

    this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(ConfirmDialogComponent, {
      data: {
        title: 'Delete item?',
        message: `Remove “${item.name}” from ${this.title()}?`,
        confirmLabel: 'Delete',
      },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed === true) this.emitDelete(item.id);
    });
  }

  protected drop(event: CdkDragDrop<readonly LineItem[], readonly LineItem[], number>): void {
    if (event.isPointerOverContainer && event.container === event.previousContainer) {
      this.move(event.item.data, event.currentIndex);
    }
  }

  protected move(id: number, targetIndex: number): void {
    const items = this.items();
    const reordered = moveLineItem(items, id, targetIndex);
    if (reordered !== items) {
      this.itemsReordered.emit(reordered);
    }
  }

  private emitDelete(id: number): void {
    if (!this.items().some((item) => item.id === id)) return;

    if (this.editingId() === id) this.cancelEdit();
    this.itemDeleted.emit(id);
  }
}
