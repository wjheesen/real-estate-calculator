import { Injectable, computed, inject, signal } from '@angular/core';
import { calculateBudget, isValidBudget } from '../../features/budget/budget-calculator';
import type { BudgetInputs, PlannerBudget } from '../../models/planner-records';
import { PlannerDbService } from '../../services/planner-db.service';
import { PlannerOperations } from './planner-operations';

const BUDGET_KEY = 'user-budget';

@Injectable({ providedIn: 'root' })
export class BudgetStore {
  private readonly db = inject(PlannerDbService);
  private readonly record = signal<PlannerBudget | null>(null);
  private readonly operations = inject(PlannerOperations);

  readonly saved = this.record.asReadonly();
  readonly monthlyHousingBaseline = computed(() => {
    const saved = this.record();
    return saved === null ? null : calculateBudget(saved).monthlyAvailable;
  });

  load(): Promise<PlannerBudget | null> {
    return this.operations.read(async () => {
      const saved = (await this.db.getBudget()) ?? null;
      this.record.set(saved);
      return saved;
    });
  }

  save(inputs: BudgetInputs): Promise<void> {
    if (!isValidBudget(inputs)) return Promise.reject(new RangeError('Invalid budget inputs.'));

    const draft = structuredClone(inputs);
    return this.operations.write(async () => {
      let saved!: PlannerBudget;
      await this.db.transaction('budget', 'readwrite', (store) => {
        const read: IDBRequest<PlannerBudget | undefined> = store.get(BUDGET_KEY);
        read.onsuccess = () => {
          const now = new Date().toISOString();
          saved = { ...draft, key: BUDGET_KEY, createdAt: read.result?.createdAt ?? now, updatedAt: now };
          store.put(saved);
        };
        return read;
      });
      this.record.set(saved);
    });
  }

  clear(): Promise<void> {
    return this.operations.write(async () => {
      await this.db.transaction('budget', 'readwrite', (store) => store.delete(BUDGET_KEY));
      this.record.set(null);
    });
  }

  publishCommitted(budget: PlannerBudget | null): void {
    this.record.set(budget);
  }
}
