import type { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import type { PlannerPortfolio } from '../../models/planner-records';
import {
  InputDialogComponent, type InputDialogData, type InputDialogResult,
} from '../../shared/components/dialogs/input-dialog.component';

export function openPortfolioNameDialog(
  dialog: MatDialog,
  portfolios: readonly PlannerPortfolio[],
  current?: PlannerPortfolio,
): Promise<InputDialogResult | undefined> {
  return firstValueFrom(dialog.open<InputDialogComponent, InputDialogData, InputDialogResult>(
    InputDialogComponent, {
      data: {
        title: current ? 'Rename portfolio' : 'New portfolio',
        submitLabel: current ? 'Save name' : 'Create portfolio',
        initialName: current?.name,
        initialDescription: current?.description,
        existingNames: portfolios.filter(({ id }) => id !== current?.id).map(({ name }) => name),
      },
    },
  ).afterClosed());
}
