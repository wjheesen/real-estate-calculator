export interface PropertyMove {
  readonly propertyId: number;
  readonly targetId: number;
}

export interface PropertyDrop {
  readonly isPointerOverContainer: boolean;
  readonly previousContainer: { readonly data: number };
  readonly container: { readonly data: number };
  readonly item: { readonly data: number };
}

export function propertyMoveFromDrop(event: PropertyDrop): PropertyMove | null {
  const propertyId = event.item.data;
  const targetId = event.container.data;
  if (!event.isPointerOverContainer || event.previousContainer.data === targetId
    || !Number.isSafeInteger(propertyId) || propertyId <= 0
    || !Number.isSafeInteger(targetId) || targetId <= 0) {
    return null;
  }
  return { propertyId, targetId };
}
