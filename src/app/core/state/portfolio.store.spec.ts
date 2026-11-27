import { TestBed } from '@angular/core/testing';
import type { PropertyDraft } from '../../models/property-inputs';
import { PlannerDbService, requestResult } from '../../services/planner-db.service';
import { PortfolioStore } from './portfolio.store';

describe('PortfolioStore', () => {
  const fixture: PropertyDraft = {
    portfolioId: 1,
    name: 'Oak Street',
    description: 'Original description',
    ownershipStatus: 'selling',
    purchasePrice: 200000,
    sellingCostsPercentage: 6,
    existingLoanBalance: 205000,
  };

  let store: PortfolioStore;
  let db: PlannerDbService;

  beforeEach(async () => {
    db = TestBed.inject(PlannerDbService);
    store = TestBed.inject(PortfolioStore);
    const now = new Date().toISOString();
    await db.transact(['properties', 'portfolios'], 'readwrite', async (tx) => {
      await requestResult(tx.objectStore('properties').clear());
      const portfolios = tx.objectStore('portfolios');
      await requestResult(portfolios.clear());
      await requestResult(portfolios.add({ id: 1, name: 'My Portfolio', createdAt: now, updatedAt: now }));
    });
  });

  it('creates and renames trimmed portfolios with unique case-insensitive names', async () => {
    const id = await store.createPortfolio('  Rentals  ', 'Long-term properties');
    await expectAsync(store.createPortfolio('rentals')).toBeRejectedWithError(/already uses/);
    await expectAsync(store.createPortfolio('  ')).toBeRejectedWithError(/Enter a name/);
    await expectAsync(store.renamePortfolio(id, 'MY PORTFOLIO')).toBeRejectedWithError(/already uses/);
    const renamed = await store.renamePortfolio(id, '  RENTALS  ');
    expect(renamed.name).toBe('RENTALS');
    expect(renamed.description).toBe('Long-term properties');
    expect((await store.load()).portfolios.map((portfolio) => portfolio.name)).toEqual(['My Portfolio', 'RENTALS']);
  });

  it('saves a new record once and applies successive updates to the existing ID', async () => {
    const inserted = await store.saveProperty({ ...fixture, name: '  Oak Street  ' });
    const first = await store.saveProperty({ ...inserted, purchasePrice: 210000 });
    const second = await store.saveProperty({ ...first, purchasePrice: 220000 });

    expect(inserted.id).toBeGreaterThan(0);
    expect(second.id).toBe(inserted.id);
    expect(second.name).toBe('Oak Street');
    expect(second.createdAt).toBe(inserted.createdAt);
    expect(second.updatedAt).toBe(new Date(second.updatedAt).toISOString());
    expect((await store.load()).properties).toEqual([second]);
    expect(await store.saveProperty(second)).toEqual(second);

    await store.deleteProperty(inserted.id);
    expect((await store.load()).properties).toEqual([]);
    expect(store.portfolios().length).toBe(1);
  });

  it('checks parent existence, rejects stale update IDs and stores only fields for the selected mode', async () => {
    await expectAsync(store.saveProperty({ ...fixture, portfolioId: 999 })).toBeRejectedWithError(/Portfolio not found/);
    await expectAsync(store.saveProperty({ ...fixture, id: 999 })).toBeRejectedWithError(/Property not found/);
    await expectAsync(store.saveProperty({ ...fixture, purchasePrice: NaN })).toBeRejectedWithError(/purchasePrice/);
    const extra = { ...fixture, downPayment: 20, results: { monthlyReturn: 3 }, scenarioId: 1 };
    const saved = await store.saveProperty(extra);
    expect(Object.keys(saved).sort()).toEqual([
      'id', 'portfolioId', 'name', 'description', 'createdAt', 'updatedAt',
      'ownershipStatus', 'purchasePrice', 'existingLoanBalance', 'sellingCostsPercentage',
    ].sort());
  });

  it('creates independent property copies in the same and different portfolios', async () => {
    const destination = await store.createPortfolio('Rentals');
    const source = await store.saveProperty(fixture);
    const same = await store.copyPropertyToPortfolio(source.id, 1);
    const other = await store.copyPropertyToPortfolio(source.id, destination, '  Copied home  ');
    expect(new Set([source.id, same, other]).size).toBe(3);
    const children = (await store.load()).properties;
    expect(children.find((item) => item.id === same)).toEqual(jasmine.objectContaining(fixture));
    expect(children.find((item) => item.id === other)).toEqual(jasmine.objectContaining({
      portfolioId: destination, name: 'Copied home', description: fixture.description,
    }));
  });

  it('moves the same record and treats a same-parent move as a no-op', async () => {
    const destination = await store.createPortfolio('Rentals');
    const source = await store.saveProperty(fixture);
    expect(await store.movePropertyToPortfolio(source.id, 1)).toEqual(source);
    const moved = await store.movePropertyToPortfolio(source.id, destination);
    expect(moved.id).toBe(source.id);
    expect(moved.portfolioId).toBe(destination);
    expect(moved.createdAt).toBe(source.createdAt);
    expect((await store.load()).properties).toEqual([moved]);
  });

  it('reassigns properties to the remaining portfolio with the lowest ID and protects the last portfolio', async () => {
    await expectAsync(store.deletePortfolio(1)).toBeRejectedWithError(/at least one portfolio/);
    const first = await store.createPortfolio('Rentals');
    const second = await store.createPortfolio('Other');
    const child = await store.saveProperty(fixture);
    const destination = await store.getDeleteDestination(1);
    expect(destination.id).toBe(first);
    await expectAsync(store.deletePortfolio(1, second)).toBeRejectedWithError(/destination changed/);
    expect(await store.deletePortfolio(1, destination.id)).toBe(first);
    const snapshot = await store.load();
    expect(snapshot.portfolios.map(({ id }) => id)).toEqual([first, second]);
    expect(snapshot.properties[0]).toEqual(jasmine.objectContaining({
      id: child.id, portfolioId: first, createdAt: child.createdAt,
    }));
  });

  it('copies portfolios and their properties independently with deterministic names', async () => {
    const first = await store.saveProperty(fixture);
    const copy = await store.duplicatePortfolio(1);
    const secondCopy = await store.duplicatePortfolio(1);
    const snapshot = await store.load();
    expect(snapshot.portfolios.find(({ id }) => id === copy)?.name).toBe('My Portfolio (Copy)');
    expect(snapshot.portfolios.find(({ id }) => id === secondCopy)?.name).toBe('My Portfolio (Copy 2)');
    expect(snapshot.properties.length).toBe(3);
    expect(snapshot.properties.find((item) => item.portfolioId === copy))
      .toEqual(jasmine.objectContaining({ ...fixture, portfolioId: copy }));
    expect(snapshot.properties.find((item) => item.portfolioId === secondCopy)?.id).not.toBe(first.id);
  });

  it('rolls back a parent and all children when the transaction aborts after the first child write', async () => {
    await store.saveProperty(fixture);
    await store.saveProperty({ ...fixture, name: 'Maple Avenue' });
    const original = await store.load();
    const add = IDBObjectStore.prototype.add;
    const intercepted = jasmine.createSpy();
    const spy = spyOn(IDBObjectStore.prototype, 'add').and.callFake(function (this: IDBObjectStore, value, key) {
      const request = add.call(this, value, key);
      if (this.name === 'properties') {
        request.addEventListener('success', () => {
          intercepted();
          this.transaction.abort();
        });
      }
      return request;
    });

    await expectAsync(store.duplicatePortfolio(1)).toBeRejected();
    expect(intercepted).toHaveBeenCalledTimes(1);
    expect(store.portfolios()).toBe(original.portfolios);
    expect(store.properties()).toBe(original.properties);

    spy.and.callThrough();
    const reopened = new PlannerDbService();
    const persisted = await reopened.transact<typeof original>(['portfolios', 'properties'], 'readonly', async (tx) => ({
      portfolios: await requestResult(tx.objectStore('portfolios').getAll()),
      properties: await requestResult(tx.objectStore('properties').getAll()),
    }));
    expect(persisted).toEqual(original);
  });
});
