import { PLANNER_DB_NAME, PlannerDbService } from './planner-db.service';

function deletePlannerDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PLANNER_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Planner database still has an open connection.'));
  });
}

describe('PlannerDbService', () => {
  const service = new PlannerDbService();

  beforeEach(deletePlannerDb);
  afterEach(deletePlannerDb);

  it('creates the version 1 schema and begins without a budget', async () => {
    const db = await service.ready();
    try {
      expect(db.name).toBe('RealEstatePlannerDB');
      expect(db.version).toBe(1);
      expect(Array.from(db.objectStoreNames)).toEqual(['budget', 'portfolios', 'properties', 'settings']);

      const transaction = db.transaction(Array.from(db.objectStoreNames));
      for (const name of ['settings', 'budget']) {
        const store = transaction.objectStore(name);
        expect(store.keyPath).toBe('key');
        expect(store.autoIncrement).toBeFalse();
      }
      for (const [name, index] of [['portfolios', 'name'], ['properties', 'portfolioId']]) {
        const store = transaction.objectStore(name);
        expect(store.keyPath).toBe('id');
        expect(store.autoIncrement).toBeTrue();
        expect(Array.from(store.indexNames)).toEqual([index]);
        expect(store.index(index).keyPath).toBe(index);
      }
    } finally {
      db.close();
    }

    expect(await service.getBudget()).toBeUndefined();
  });

  it('seeds exactly one portfolio and leaves it intact on reopen', async () => {
    const firstRead = await service.getPortfolios();
    expect(firstRead.length).toBe(1);
    expect(firstRead[0]).toEqual(jasmine.objectContaining({ id: 1, name: 'My Portfolio' }));
    expect(firstRead[0].createdAt).toBe(new Date(firstRead[0].createdAt).toISOString());
    expect(firstRead[0].updatedAt).toBe(firstRead[0].createdAt);

    const reopened = new PlannerDbService();
    expect(await reopened.getPortfolios()).toEqual(firstRead);

    await reopened.transaction('portfolios', 'readwrite', (store) => store.delete(1));
    expect(await reopened.getPortfolios()).toEqual([]);
  });

  it('persists the theme while preserving other settings', async () => {
    await service.transaction('settings', 'readwrite', (store) =>
      store.put({ key: 'app-settings', interestRate: 5, nested: { preserved: true } }),
    );
    await service.updateSettings((record) => ({ ...record, key: 'app-settings', themeMode: 'dark' }));
    const reopened = new PlannerDbService();
    expect(await reopened.getSettings()).toEqual(jasmine.objectContaining({
      key: 'app-settings',
      themeMode: 'dark',
      interestRate: 5,
      nested: { preserved: true },
    }));
  });

  it('rejects a failed write and leaves the seed intact', async () => {
    const [seed] = await service.getPortfolios();
    const write = service.transaction('portfolios', 'readwrite', (store) =>
      store.add({ ...seed, name: 'Duplicate' }),
    );

    await expectAsync(write).toBeRejectedWith(jasmine.objectContaining({ name: 'ConstraintError' }));
    expect(await service.getPortfolios()).toEqual([seed]);
  });

  it('rejects on abort even if the write request already succeeded', async () => {
    await service.updateSettings(() => ({ key: 'app-settings', themeMode: 'light' }));
    const requestSucceeded = jasmine.createSpy();
    const write = service.transaction('settings', 'readwrite', (store) => {
      const request = store.put({ key: 'app-settings', themeMode: 'dark' });
      request.onsuccess = () => {
        requestSucceeded();
        store.transaction.abort();
      };
      return request;
    });

    await expectAsync(write).toBeRejectedWith(jasmine.objectContaining({ name: 'AbortError' }));
    expect(requestSucceeded).toHaveBeenCalledTimes(1);
    expect(await service.getSettings()).toEqual({ key: 'app-settings', themeMode: 'light' });
  });
});
