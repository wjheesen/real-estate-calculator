import { type LineItem, moveLineItem, nextLineItemId } from './list-helpers';

describe('line item helpers', () => {
  const items: readonly LineItem[] = Object.freeze([
    { id: 9, name: 'First', amount: 0, description: 'Keep this' },
    { id: 1, name: 'Second', amount: 5 },
    { id: 4, name: 'Third', amount: 2 },
  ]);

  it('allocates a positive ID outside the existing set', () => {
    expect(nextLineItemId([])).toBe(1);
    expect(nextLineItemId(items)).toBe(2);
  });

  it('moves the first item to the last position without modifying the source', () => {
    const result = moveLineItem(items, 9, 2);
    expect(result.map((item) => item.id)).toEqual([1, 4, 9]);
    expect(result[2]).toBe(items[0]);
    expect(items.map((item) => item.id)).toEqual([9, 1, 4]);
  });

  it('returns the source for same-position, out-of-range, fractional or missing moves', () => {
    for (const index of [0, -1, 3, 0.5, NaN]) {
      expect(moveLineItem(items, 9, index)).toBe(items);
    }
    expect(moveLineItem(items, 99, 1)).toBe(items);
  });
});
