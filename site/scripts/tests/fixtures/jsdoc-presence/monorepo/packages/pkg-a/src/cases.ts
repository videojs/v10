// One file per rule so a failing assertion points at the rule directly.

/** A documented function. */
export function Documented(): void {}

export function Undocumented(): void {}

export interface WithMembers {
  x: number;
}

/** @internal */
export function Internal(): void {}

/** @deprecated use the new one */
export function TagsOnly(): void {}

interface Base {
  y: number;
}

// Leaf wrappers (carve-out): empty-body extends interface + pure-alias type.
export interface LeafWrapper extends Base {}
export type PureAlias = Base;
