import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, type ConfirmDialogData } from './confirm-dialog.component';
import {
  CopyPropertyDialogComponent, type CopyPropertyDialogData, type CopyPropertyDialogResult,
} from './copy-property-dialog.component';
import {
  ExportOptionsDialogComponent, type ExportOptionsDialogResult,
} from './export-options-dialog.component';
import { InputDialogComponent, type InputDialogData, type InputDialogResult } from './input-dialog.component';

@Component({ template: '<button type="button">Open dialog</button>' })
class DialogHost {}

describe('shared Material dialogs', () => {
  let fixture: ComponentFixture<DialogHost>;
  let dialog: MatDialog;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(DialogHost);
    fixture.detectChanges();
    dialog = TestBed.inject(MatDialog);
    trigger = fixture.nativeElement.querySelector('button');
    trigger.focus();
  });

  const openConfirm = () => dialog.open<ConfirmDialogComponent, ConfirmDialogData, true>(
    ConfirmDialogComponent, { data: { title: 'Delete item?', message: 'Remove this item?' } },
  );
  const openInput = (existingNames?: readonly string[]) =>
    dialog.open<InputDialogComponent, InputDialogData, InputDialogResult>(InputDialogComponent, {
      data: { title: 'Name portfolio', existingNames },
    });
  const openCopy = () =>
    dialog.open<CopyPropertyDialogComponent, CopyPropertyDialogData, CopyPropertyDialogResult>(
      CopyPropertyDialogComponent, { data: { portfolios: [{ id: 7, name: 'Rentals' }] } },
    );
  const openExport = () =>
    dialog.open<ExportOptionsDialogComponent, undefined, ExportOptionsDialogResult>(
      ExportOptionsDialogComponent,
    );

  function currentDialog(): HTMLElement {
    return document.getElementById(dialog.openDialogs[0].id)!;
  }

  function action(label: string): HTMLButtonElement {
    return Array.from(currentDialog().querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === label)!;
  }

  function setField(name: string, value: string): void {
    const field = currentDialog().querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[formControlName="${name}"]`,
    )!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function requestSubmit(): void {
    currentDialog().querySelector('form')!.requestSubmit();
    fixture.detectChanges();
  }

  it('returns true only for the explicit Confirm action', async () => {
    const canceled = firstValueFrom(openConfirm().afterClosed());
    await fixture.whenStable();
    expect(document.activeElement).toBe(action('Cancel'));
    action('Cancel').click();
    expect(await canceled).toBeUndefined();

    const confirmed = firstValueFrom(openConfirm().afterClosed());
    await fixture.whenStable();
    action('Confirm').click();
    expect(await confirmed).toBeTrue();
    expect(document.activeElement).toBe(trigger);
  });

  it('validates whitespace and duplicate names, then submits one trimmed input result', async () => {
    const ref = openInput(['  Rentals  ']);
    const beforeClose = jasmine.createSpy();
    ref.beforeClosed().subscribe(beforeClose);
    const result = firstValueFrom(ref.afterClosed());
    await fixture.whenStable();

    setField('name', '  ');
    requestSubmit();
    expect(currentDialog().textContent).toContain('Enter a name.');
    setField('name', '  RENTALS  ');
    requestSubmit();
    expect(currentDialog().textContent).toContain('This name is already in use.');
    expect(beforeClose).not.toHaveBeenCalled();

    setField('name', '  Apartments  ');
    setField('description', '  Long-term leases  ');
    const form = currentDialog().querySelector('form')!;
    form.requestSubmit();
    form.requestSubmit();
    expect(await result).toEqual({ name: 'Apartments', description: 'Long-term leases' });
    expect(beforeClose).toHaveBeenCalledTimes(1);
  });

  it('returns a target portfolio ID and an optional trimmed copy name', async () => {
    const result = firstValueFrom(openCopy().afterClosed());
    await fixture.whenStable();
    requestSubmit();
    expect(currentDialog().textContent).toContain('Select a target portfolio.');

    const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    const target = await loader.getHarness(MatSelectHarness);
    await target.clickOptions({ text: 'Rentals' });
    setField('name', '  Oak Street copy ');
    requestSubmit();
    expect(await result).toEqual({ portfolioId: 7, name: 'Oak Street copy' });
  });

  it('defaults export figures off and returns an explicit opt-in', async () => {
    const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    const defaults = firstValueFrom(openExport().afterClosed());
    const initialOption = await loader.getHarness(MatCheckboxHarness);
    expect(await initialOption.isChecked()).toBeFalse();
    requestSubmit();
    expect(await defaults).toEqual({ includeCalculatedFigures: false });

    const optedIn = firstValueFrom(openExport().afterClosed());
    const nextOption = await loader.getHarness(MatCheckboxHarness);
    await nextOption.check();
    requestSubmit();
    expect(await optedIn).toEqual({ includeCalculatedFigures: true });
  });

  const cancellations = [
    ['Confirm', () => firstValueFrom(openConfirm().afterClosed())],
    ['Input', () => firstValueFrom(openInput().afterClosed())],
    ['Copy Property', () => firstValueFrom(openCopy().afterClosed())],
    ['Export Options', () => firstValueFrom(openExport().afterClosed())],
  ] satisfies [string, () => Promise<unknown>][];

  for (const [title, openResult] of cancellations) {
    it(`cancels ${title} via Cancel, Escape and backdrop click and restores focus`, async () => {
      const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
      const canceled = openResult();
      await fixture.whenStable();
      action('Cancel').click();
      expect(await canceled).toBeUndefined();
      expect(document.activeElement).toBe(trigger);

      const escaped = openResult();
      await (await loader.getHarness(MatDialogHarness)).close();
      expect(await escaped).toBeUndefined();
      expect(document.activeElement).toBe(trigger);

      const dismissed = openResult();
      await fixture.whenStable();
      document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
      expect(await dismissed).toBeUndefined();
      expect(document.activeElement).toBe(trigger);
    });
  }
});
