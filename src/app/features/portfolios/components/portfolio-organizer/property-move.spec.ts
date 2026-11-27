import { propertyMoveFromDrop, type PropertyDrop } from './property-move';

describe('propertyMoveFromDrop', () => {
  const crossColumn: PropertyDrop = {
    previousContainer: { data: 1 }, container: { data: 2 }, item: { data: 7 }, isPointerOverContainer: true,
  };

  it('takes the stable property and portfolio IDs from the drop data', () => {
    expect(propertyMoveFromDrop(crossColumn)).toEqual({ propertyId: 7, targetId: 2 });
  });

  it('ignores same-column, outside, and invalid drops', () => {
    expect(propertyMoveFromDrop({ ...crossColumn, container: { data: 1 } })).toBeNull();
    expect(propertyMoveFromDrop({ ...crossColumn, isPointerOverContainer: false })).toBeNull();
    expect(propertyMoveFromDrop({ ...crossColumn, item: { data: -1 } })).toBeNull();
    expect(propertyMoveFromDrop({ ...crossColumn, container: { data: 2.5 } })).toBeNull();
  });
});
