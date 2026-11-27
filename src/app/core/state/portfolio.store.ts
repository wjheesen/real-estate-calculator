import { Injectable, computed, inject, signal } from '@angular/core';
import { PropertyValidationError, validatePropertyInputs } from '../../features/calculator/property-validation';
import { aggregatePortfolio } from '../../features/portfolios/portfolio-aggregator';
import type { PlannerPortfolio, PlannerProperty } from '../../models/planner-records';
import type { PropertyDetails, PropertyDraft } from '../../models/property-inputs';
import { propertyRecordInputs } from '../../models/property-record-shape';
import { PlannerDbService, requestResult, type StoreName } from '../../services/planner-db.service';
import { BudgetStore } from './budget.store';
import { PlannerOperations } from './planner-operations';

interface PortfolioRecords {
  readonly portfolios: readonly PlannerPortfolio[];
  readonly properties: readonly PlannerProperty[];
}

const stores: StoreName[] = ['portfolios', 'properties'];

function validId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function requireName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a name.');
  return trimmed;
}

function descriptionField(description?: string | null): { readonly description?: string } {
  return description?.trim() ? { description } : {};
}

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

async function allPortfolios(store: IDBObjectStore): Promise<PlannerPortfolio[]> {
  return requestResult(store.getAll());
}

async function requireRecord<T>(store: IDBObjectStore, id: number, label: string): Promise<T> {
  if (!validId(id)) throw new Error(`${label} ID is invalid.`);
  const result: T | undefined = await requestResult(store.get(id));
  if (result === undefined) throw new Error(`${label} not found.`);
  return result;
}

function deletionDestination(portfolios: readonly PlannerPortfolio[], id: number): PlannerPortfolio {
  if (!portfolios.some((portfolio) => portfolio.id === id)) throw new Error('Portfolio not found.');
  // A getAll() result is in ascending primary key order.
  const remaining = portfolios.find((portfolio) => portfolio.id !== id);
  if (!remaining) throw new Error('Keep at least one portfolio.');
  return remaining;
}

function timestamps(): { createdAt: string; updatedAt: string } {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
}

function sameFields(left: object, right: object): boolean {
  const a = Object.entries(left);
  const b = new Map(Object.entries(right));
  return a.length === b.size && a.every(([key, value]) => b.get(key) === value);
}

async function readSnapshot(portfolios: IDBObjectStore, properties: IDBObjectStore): Promise<PortfolioRecords> {
  const [parents, children] = await Promise.all([
    allPortfolios(portfolios),
    requestResult<PlannerProperty[]>(properties.getAll()),
  ]);
  return { portfolios: parents, properties: children };
}

@Injectable({ providedIn: 'root' })
export class PortfolioStore {
  private readonly db = inject(PlannerDbService);
  private readonly budget = inject(BudgetStore);
  private readonly state = signal<PortfolioRecords>({ portfolios: [], properties: [] });
  private readonly operations = inject(PlannerOperations);

  readonly portfolios = computed(() => this.state().portfolios);
  readonly properties = computed(() => this.state().properties);
  readonly summaries = computed(() => {
    const { portfolios, properties } = this.state();
    const baseline = this.budget.monthlyHousingBaseline();
    return new Map(portfolios.map(({ id }) => [id, aggregatePortfolio(id, properties, baseline)]));
  });

  load(): Promise<PortfolioRecords> {
    return this.operations.read(async () => {
      const snapshot = await this.db.transact(stores, 'readonly', (tx) =>
        readSnapshot(tx.objectStore('portfolios'), tx.objectStore('properties')));
      this.state.set(snapshot);
      return snapshot;
    });
  }

  createPortfolio(name: string, description?: string): Promise<number> {
    return this.write(async (portfolios) => {
      const trimmed = requireName(name);
      this.requireUniqueName(await allPortfolios(portfolios), trimmed);
      const id = await requestResult(portfolios.add({ name: trimmed, ...descriptionField(description), ...timestamps() }));
      return (await requireRecord<PlannerPortfolio>(portfolios, Number(id), 'Portfolio')).id;
    });
  }

  renamePortfolio(id: number, name: string, description?: string | null): Promise<PlannerPortfolio> {
    return this.write(async (portfolios) => {
      const trimmed = requireName(name);
      const current = await requireRecord<PlannerPortfolio>(portfolios, id, 'Portfolio');
      this.requireUniqueName(await allPortfolios(portfolios), trimmed, id);
      const nextDescription = descriptionField(description === undefined ? current.description : description);
      if (trimmed === current.name && nextDescription.description === current.description) return current;
      const { description: prior, ...fields } = current;
      await requestResult(portfolios.put({
        ...fields, ...nextDescription, name: trimmed, updatedAt: new Date().toISOString(),
      }));
      return requireRecord<PlannerPortfolio>(portfolios, id, 'Portfolio');
    });
  }

  duplicatePortfolio(id: number): Promise<number> {
    return this.write(async (portfolios, properties) => {
      const source = await requireRecord<PlannerPortfolio>(portfolios, id, 'Portfolio');
      const names = new Set((await allPortfolios(portfolios)).map((portfolio) => normalizedName(portfolio.name)));
      let name = `${source.name} (Copy)`;
      for (let suffix = 2; names.has(normalizedName(name)); suffix++) {
        name = `${source.name} (Copy ${suffix})`;
      }

      const newId = Number(await requestResult(portfolios.add({
        name, ...descriptionField(source.description), ...timestamps(),
      })));
      const children: PlannerProperty[] = await requestResult(properties.index('portfolioId').getAll(id));
      for (const child of children) {
        await this.insertProperty(properties, {
          ...propertyRecordInputs(child),
          name: child.name, portfolioId: newId, ...descriptionField(child.description),
        });
      }
      return (await requireRecord<PlannerPortfolio>(portfolios, newId, 'Portfolio')).id;
    });
  }

  getDeleteDestination(id: number): Promise<PlannerPortfolio> {
    return this.operations.read(() => this.db.transact('portfolios', 'readonly', async (tx) =>
      deletionDestination(await allPortfolios(tx.objectStore('portfolios')), id)));
  }

  deletePortfolio(id: number, confirmedDestinationId?: number): Promise<number> {
    return this.write(async (portfolios, properties) => {
      const destination = deletionDestination(await allPortfolios(portfolios), id);
      if (confirmedDestinationId !== undefined && confirmedDestinationId !== destination.id) {
        throw new Error('Portfolio destination changed. Confirm the new destination.');
      }
      const children: PlannerProperty[] = await requestResult(properties.index('portfolioId').getAll(id));
      const now = new Date().toISOString();
      for (const child of children) {
        await requestResult(properties.put({ ...child, portfolioId: destination.id, updatedAt: now }));
      }
      await requestResult(portfolios.delete(id));
      return destination.id;
    });
  }

  saveProperty(draft: PropertyDraft): Promise<PlannerProperty> {
    const { id, portfolioId, name, description } = draft;
    const inputs = { ...draft };
    const { errors } = validatePropertyInputs(inputs);
    if (Object.keys(errors).length) return Promise.reject(new PropertyValidationError(errors));
    return this.write(async (portfolios, properties) => {
      const details: PropertyDetails = {
        ...propertyRecordInputs(inputs), portfolioId, name: requireName(name), ...descriptionField(description),
      };
      await requireRecord<PlannerPortfolio>(portfolios, portfolioId, 'Portfolio');
      if (id === undefined) return this.insertProperty(properties, details);

      const current = await requireRecord<PlannerProperty>(properties, id, 'Property');
      const { id: priorId, createdAt, updatedAt, ...prior } = current;
      if (sameFields(prior, details)) return current;

      await requestResult(properties.put({
        ...details, id, createdAt, updatedAt: new Date().toISOString(),
      }));
      return requireRecord<PlannerProperty>(properties, id, 'Property');
    });
  }

  deleteProperty(id: number): Promise<void> {
    return this.write(async (_portfolios, properties) => {
      await requireRecord<PlannerProperty>(properties, id, 'Property');
      await requestResult(properties.delete(id));
    });
  }

  copyPropertyToPortfolio(id: number, targetId: number, name?: string): Promise<number> {
    return this.write(async (portfolios, properties) => {
      const source = await requireRecord<PlannerProperty>(properties, id, 'Property');
      await requireRecord<PlannerPortfolio>(portfolios, targetId, 'Portfolio');
      const copy = await this.insertProperty(properties, {
        ...propertyRecordInputs(source), portfolioId: targetId,
        name: name === undefined ? source.name : requireName(name), ...descriptionField(source.description),
      });
      return copy.id;
    });
  }

  movePropertyToPortfolio(id: number, targetId: number): Promise<PlannerProperty> {
    return this.write(async (portfolios, properties) => {
      const source = await requireRecord<PlannerProperty>(properties, id, 'Property');
      await requireRecord<PlannerPortfolio>(portfolios, targetId, 'Portfolio');
      if (source.portfolioId === targetId) return source;

      await requestResult(properties.put({ ...source, portfolioId: targetId, updatedAt: new Date().toISOString() }));
      return requireRecord<PlannerProperty>(properties, id, 'Property');
    });
  }

  private async insertProperty(store: IDBObjectStore, details: PropertyDetails): Promise<PlannerProperty> {
    const id = Number(await requestResult(store.add({ ...details, ...timestamps() })));
    return requireRecord<PlannerProperty>(store, id, 'Property');
  }

  private requireUniqueName(portfolios: readonly PlannerPortfolio[], name: string, exceptId?: number): void {
    const target = normalizedName(name);
    if (portfolios.some((portfolio) => portfolio.id !== exceptId && normalizedName(portfolio.name) === target)) {
      throw new Error('A portfolio already uses that name.');
    }
  }

  private write<T>(run: (portfolios: IDBObjectStore, properties: IDBObjectStore) => Promise<T>): Promise<T> {
    return this.operations.write(async () => {
      const { result, snapshot } = await this.db.transact(stores, 'readwrite', async (tx) => {
        const portfolios = tx.objectStore('portfolios');
        const properties = tx.objectStore('properties');
        const result = await run(portfolios, properties);
        const snapshot = await readSnapshot(portfolios, properties);
        return { result, snapshot };
      });
      this.state.set(snapshot);
      return result;
    });
  }

  publishCommitted(portfolios: readonly PlannerPortfolio[], properties: readonly PlannerProperty[]): void {
    this.state.set({ portfolios, properties });
  }
}
