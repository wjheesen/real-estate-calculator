export interface LineItem {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  readonly description?: string;
}

export function nextLineItemId(items: readonly LineItem[]): number {
  const usedIds = new Set(items.map((item) => item.id));
  let id = 1;
  while (usedIds.has(id)) {
    id++;
  }
  return id;
}

export function moveLineItem(
  items: readonly LineItem[],
  id: number,
  targetIndex: number,
): readonly LineItem[] {
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex === -1 || currentIndex === targetIndex) {
    return items;
  }

  const reordered = [...items];
  const [item] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, item);
  return reordered;
}
