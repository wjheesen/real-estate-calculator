import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import type { LineItem } from '../../utils/list-helpers';
import { ReorderableListComponent } from './reorderable-list.component';

describe('ReorderableListComponent', () => {
  let fixture: ComponentFixture<ReorderableListComponent>;
  let host: HTMLElement;
  const items: readonly LineItem[] = Object.freeze([
    Object.freeze({ id: 3, name: 'Insurance', amount: 50, description: 'Shared policy' }),
    Object.freeze({ id: 1, name: 'Utilities', amount: 75.5 }),
    Object.freeze({ id: 8, name: 'Dues', amount: 30 }),
  ]);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(ReorderableListComponent);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('title', 'Monthly expenses');
    fixture.componentRef.setInput('amountSuffix', '$/month');
    fixture.componentRef.setInput('namePlaceholder', 'e.g. Insurance');
    fixture.detectChanges();
    host = fixture.nativeElement;
  });

  function setField(name: 'name' | 'amount', value: string): void {
    const input = host.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    return host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  }

  function submit(): void {
    host.querySelector('form')!.requestSubmit();
    fixture.detectChanges();
  }

  it('adds a trimmed item with a zero amount and a unique ID', () => {
    const added = jasmine.createSpy();
    fixture.componentInstance.itemAdded.subscribe(added);
    setField('name', '  Parking  ');
    setField('amount', '0');
    submit();
    expect(added).toHaveBeenCalledOnceWith({ id: 2, name: 'Parking', amount: 0 });
    expect(items.length).toBe(3);
    expect(host.querySelector('mat-error')).toBeNull();
  });

  it('rejects blank names and invalid amounts', () => {
    const added = jasmine.createSpy();
    fixture.componentInstance.itemAdded.subscribe(added);
    setField('name', '  ');
    setField('amount', '0');
    submit();
    expect(host.textContent).toContain('Enter a name.');

    setField('name', 'Parking');
    for (const amount of ['-1', '', '1e999']) {
      setField('amount', amount);
      submit();
      expect(host.textContent).toContain('Enter a non-negative amount.');
    }
    expect(added).not.toHaveBeenCalled();
  });

  it('updates the current item by ID and preserves its description', () => {
    const updated = jasmine.createSpy();
    fixture.componentInstance.itemUpdated.subscribe(updated);
    button('Edit Insurance').click();
    fixture.detectChanges();
    setField('name', '  Home insurance ');
    setField('amount', '52');
    submit();
    expect(updated).toHaveBeenCalledOnceWith({
      id: 3, name: 'Home insurance', amount: 52, description: 'Shared policy',
    });
    expect(items[0].name).toBe('Insurance');
    expect(items[0].amount).toBe(50);
  });

  it('discards a canceled edit', () => {
    const updated = jasmine.createSpy();
    fixture.componentInstance.itemUpdated.subscribe(updated);
    button('Edit Insurance').click();
    fixture.detectChanges();
    setField('name', 'Changed');
    host.querySelector<HTMLButtonElement>('.form-actions button[type="button"]')!.click();
    fixture.detectChanges();
    expect(updated).not.toHaveBeenCalled();
    expect(host.querySelector('li')?.textContent).toContain('Insurance');
    expect(host.querySelector('form button[type="submit"]')?.textContent?.trim()).toBe('Add');
  });

  it('emits a delete ID only when the requested Material confirmation is accepted', async () => {
    fixture.componentRef.setInput('confirmDelete', true);
    fixture.detectChanges();
    const deleted = jasmine.createSpy();
    fixture.componentInstance.itemDeleted.subscribe(deleted);

    async function answer(label: string): Promise<void> {
      button('Delete Insurance').click();
      await fixture.whenStable();
      const ref = TestBed.inject(MatDialog).openDialogs[0];
      const dialog = document.getElementById(ref.id)!;
      const action = Array.from(dialog.querySelectorAll('button'))
        .find((candidate) => candidate.textContent?.trim() === label)!;
      action.click();
      await fixture.whenStable();
    }

    await answer('Cancel');
    expect(deleted).not.toHaveBeenCalled();
    await answer('Delete');
    expect(deleted).toHaveBeenCalledOnceWith(3);
    expect(items.length).toBe(3);
  });

  it('emits the new order for a first-to-last drop and leaves its inputs intact', () => {
    const reordered = jasmine.createSpy();
    fixture.componentInstance.itemsReordered.subscribe(reordered);
    const list = fixture.debugElement.query(By.directive(CdkDropList));
    const container = list.injector.get(CdkDropList);
    const item = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    const drop = { item, container, previousContainer: container, isPointerOverContainer: true };
    list.triggerEventHandler('cdkDropListDropped', { ...drop, currentIndex: 0 });
    list.triggerEventHandler('cdkDropListDropped', { ...drop, currentIndex: -1 });
    expect(reordered).not.toHaveBeenCalled();

    list.triggerEventHandler('cdkDropListDropped', { ...drop, currentIndex: 2 });
    expect(reordered).toHaveBeenCalledOnceWith([items[1], items[2], items[0]]);
    expect(items.map(({ id }) => id)).toEqual([3, 1, 8]);
  });

  it('supports keyboard-operable moves and displays the unit-labeled total and empty state', () => {
    const reordered = jasmine.createSpy();
    fixture.componentInstance.itemsReordered.subscribe(reordered);
    button('Move Insurance down').click();
    expect(reordered).toHaveBeenCalledOnceWith([items[1], items[0], items[2]]);
    expect(host.querySelector('footer')?.textContent).toContain('155.5 $/month');

    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('emptyMessage', 'No expenses added.');
    fixture.detectChanges();
    expect(host.textContent).toContain('No expenses added.');
    expect(host.querySelector('footer')?.textContent).toContain('0 $/month');
    expect(host.querySelector('input')?.placeholder).toBe('e.g. Insurance');
  });
});
