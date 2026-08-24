import type { AnySlice } from './slice';

type SliceIdentity = symbol;
type SliceMembership = ReadonlySet<SliceIdentity>;

const sliceIdentities = new WeakMap<AnySlice, SliceIdentity>();
const sliceMemberships = new WeakMap<AnySlice, SliceMembership>();
const snapshotMemberships = new WeakMap<object, SliceMembership>();

/** Returns the stable runtime membership represented by a slice. */
export function getSliceMembership(slice: AnySlice): SliceMembership {
  let membership = sliceMemberships.get(slice);

  if (!membership) {
    membership = new Set([getSliceIdentity(slice)]);
    sliceMemberships.set(slice, membership);
  }

  return membership;
}

/** Preserves the identity of a combined slice and every slice it contains. */
export function registerCombinedSlice(slice: AnySlice, children: readonly AnySlice[]): void {
  const membership = new Set<SliceIdentity>([getSliceIdentity(slice)]);

  for (const child of children) {
    for (const identity of getSliceMembership(child)) {
      membership.add(identity);
    }
  }

  sliceMemberships.set(slice, membership);
}

/** Associates slice membership with the final immutable public snapshot. */
export function registerSnapshot(snapshot: object, membership: SliceMembership): void {
  snapshotMemberships.set(snapshot, membership);
}

/** Returns `undefined` for ordinary objects that are not store snapshots. */
export function snapshotHasSlice(snapshot: object, slice: AnySlice): boolean | undefined {
  const membership = snapshotMemberships.get(snapshot);
  return membership?.has(getSliceIdentity(slice));
}

function getSliceIdentity(slice: AnySlice): SliceIdentity {
  let identity = sliceIdentities.get(slice);

  if (!identity) {
    identity = Symbol(slice.name);
    sliceIdentities.set(slice, identity);
  }

  return identity;
}
