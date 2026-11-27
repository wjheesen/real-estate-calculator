import { Injectable, inject } from '@angular/core';
import packageInfo from '../../../../package.json';
import type { PlannerBudget, PlannerPortfolio, PlannerProperty, PlannerSettings } from '../../models/planner-records';
import { PlannerDbService, requestResult, type StoreName } from '../../services/planner-db.service';
import { BudgetStore } from '../state/budget.store';
import { PlannerOperations } from '../state/planner-operations';
import { PortfolioStore } from '../state/portfolio.store';
import { SettingsStore, effectiveSettings } from '../state/settings.store';
import type { ArchiveState } from './archive-state';

const storeNames: StoreName[] = ['settings', 'budget', 'portfolios', 'properties'];
const settingsKey = 'app-settings';
const budgetKey = 'user-budget';

@Injectable({ providedIn: 'root' })
export class DataTransferService {
  private readonly db = inject(PlannerDbService);
  private readonly operations = inject(PlannerOperations);
  private readonly settings = inject(SettingsStore);
  private readonly budget = inject(BudgetStore);
  private readonly portfolios = inject(PortfolioStore);

  readonly refreshRequired = this.operations.refreshRequired;

  export(includeCalculatedFigures: boolean, now = new Date()): Promise<Uint8Array> {
    return this.operations.exclusive(async () => {
      const state = await this.readSnapshot();
      const { encodeArchive } = await import('./zip-archive.codec');
      return encodeArchive(state, { appVersion: packageInfo.version, exportedAt: now.toISOString(), includeCalculatedFigures });
    });
  }

  restore(source: ArrayBuffer | Uint8Array | (() => Promise<ArrayBuffer>)): Promise<void> {
    return this.operations.exclusive(async () => {
      const { decodeArchive } = await import('./zip-archive.codec');
      const bytes = typeof source === 'function' ? await source() : source;
      const staged = await decodeArchive(bytes);
      await this.writeSnapshot(staged);
      await this.refreshCommitted();
    });
  }

  refresh(): Promise<void> {
    return this.operations.exclusive(() => this.refreshCommitted(), true);
  }

  private readSnapshot(): Promise<ArchiveState> {
    return this.db.transact(storeNames, 'readonly', async (tx) => {
      const [settings, budget, portfolios, properties] = await Promise.all([
        requestResult<PlannerSettings | undefined>(tx.objectStore('settings').get(settingsKey)),
        requestResult<PlannerBudget | undefined>(tx.objectStore('budget').get(budgetKey)),
        requestResult<PlannerPortfolio[]>(tx.objectStore('portfolios').getAll()),
        requestResult<PlannerProperty[]>(tx.objectStore('properties').getAll()),
      ]);
      if (budget) {
        const { key, ...fields } = budget;
        return { settings: effectiveSettings(settings), budget: fields, portfolios, properties };
      }
      return { settings: effectiveSettings(settings), budget: null, portfolios, properties };
    });
  }

  private writeSnapshot(staged: ArchiveState): Promise<void> {
    return this.db.transact(storeNames, 'readwrite', async (tx) => {
      await Promise.all(storeNames.map((name) => requestResult(tx.objectStore(name).clear())));
      await requestResult(tx.objectStore('settings').put({ ...staged.settings, key: settingsKey }));
      if (staged.budget) {
        await requestResult(tx.objectStore('budget').put({ ...staged.budget, key: budgetKey }));
      }
      const portfolios = tx.objectStore('portfolios');
      const properties = tx.objectStore('properties');
      for (const portfolio of staged.portfolios) await requestResult(portfolios.add(portfolio));
      for (const property of staged.properties) await requestResult(properties.add(property));
    });
  }

  private async refreshCommitted(): Promise<void> {
    try {
      const committed = await this.readSnapshot();
      this.settings.publishCommitted(committed.settings);
      this.budget.publishCommitted(committed.budget === null ? null : { ...committed.budget, key: budgetKey });
      this.portfolios.publishCommitted(committed.portfolios, committed.properties);
      this.operations.publishReplacement();
    } catch {
      this.operations.requireRefresh();
      throw new Error('The backup was restored. Refresh the imported data before making more changes.');
    }
  }
}
