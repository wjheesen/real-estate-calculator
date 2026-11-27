import { Injectable } from '@angular/core';
import type {
  PlannerBudget,
  PlannerPortfolio,
  PlannerSettings,
  ThemePreference,
} from '../models/planner-records';

export const PLANNER_DB_NAME = 'RealEstatePlannerDB';

const SETTINGS_KEY = 'app-settings';
const BUDGET_KEY = 'user-budget';

type StoreName = 'settings' | 'budget' | 'portfolios' | 'properties';

@Injectable({ providedIn: 'root' })
export class PlannerDbService {
  /** Open the current schema. Callers that use this directly must close the connection. */
  ready(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(PLANNER_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('settings', { keyPath: 'key' });
        db.createObjectStore('budget', { keyPath: 'key' });

        const portfolios = db.createObjectStore('portfolios', {
          keyPath: 'id',
          autoIncrement: true,
        });
        portfolios.createIndex('name', 'name');

        const properties = db.createObjectStore('properties', {
          keyPath: 'id',
          autoIncrement: true,
        });
        properties.createIndex('portfolioId', 'portfolioId');

        const now = new Date().toISOString();
        const seed: PlannerPortfolio = {
          id: 1,
          name: 'My Portfolio',
          createdAt: now,
          updatedAt: now,
        };
        portfolios.add(seed);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onblocked = () => {
        reject(new Error('An open connection is blocking the planner database.'));
        request.onsuccess = () => request.result.close();
      };
    });
  }

  /**
   * Queue requests in one transaction. The result comes from the returned request
   * after all queued work commits.
   */
  async transaction<T>(
    storeName: StoreName,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.ready();

    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        transaction.onabort = () => {
          reject(transaction.error ?? new DOMException('Transaction aborted.', 'AbortError'));
        };
        transaction.onerror = (event) => {
          reject((event.target as IDBRequest).error ?? transaction.error);
        };

        try {
          const request = run(transaction.objectStore(storeName));
          transaction.oncomplete = () => resolve(request.result);
        } catch (error) {
          reject(error);
          transaction.abort();
        }
      });
    } finally {
      db.close();
    }
  }

  getSettings(): Promise<PlannerSettings | undefined> {
    return this.transaction('settings', 'readonly', (store) => store.get(SETTINGS_KEY));
  }

  async setTheme(theme: ThemePreference): Promise<void> {
    await this.transaction('settings', 'readwrite', (store) => {
      const read: IDBRequest<PlannerSettings | undefined> = store.get(SETTINGS_KEY);
      read.onsuccess = () => {
        store.put({ ...read.result, key: SETTINGS_KEY, theme } satisfies PlannerSettings);
      };
      return read;
    });
  }

  getBudget(): Promise<PlannerBudget | undefined> {
    return this.transaction('budget', 'readonly', (store) => store.get(BUDGET_KEY));
  }

  getPortfolios(): Promise<PlannerPortfolio[]> {
    return this.transaction('portfolios', 'readonly', (store) => store.getAll());
  }

  getPortfolio(id: number): Promise<PlannerPortfolio | undefined> {
    return this.transaction('portfolios', 'readonly', (store) => store.get(id));
  }
}
