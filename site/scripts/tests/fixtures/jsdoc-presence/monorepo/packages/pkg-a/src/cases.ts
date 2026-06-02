// Test fixtures for the JSDoc-presence check — one representative export per rule
// so a failing assertion points straight at the rule it covers.

// ─── Basic presence ────────────────────────────────────────────────

/** A documented function. */
export function Documented(): void {}

export function Undocumented(): void {}

export interface WithMembers {
  x: number;
}

// ─── JSDoc shape (a summary is required; tags alone don't count) ───

/** @deprecated use the new one */
export function TagsOnly(): void {}

/** @see https://example.com */
export function TagOnlySee(): void {}

/** Toggles playback. @deprecated tag is metadata; the summary carries the meaning. */
export function SummaryWithTags(): void {}

// ─── @internal carve-out (exempt regardless of summary) ────────────

/** @internal */
export function Internal(): void {}

/** Helper utility. @internal */
export function InternalWithSummary(): void {}

// ─── Leaf-wrapper carve-out (adds nothing beyond the base) ─────────

interface Base {
  y: number;
}

namespace Inner {
  export interface InnerType {
    q: number;
  }
}

export interface LeafWrapper extends Base {}
export type PureAlias = Base;
export type QualifiedAlias = Inner.InnerType;

// ─── NOT leaf wrappers — these all add shape, so they need a summary ───

export interface ExtendsAddsMembers extends Base {
  z: number;
}

export type GenericAlias = Array<Base>;

export type UnionAlias = 'a' | 'b';

export type ObjectLiteralAlias = { z: number };

// ─── Class members (Ring 2, NOT checked) ───────────────────────────

/** A documented class. Its undocumented members are not checked. */
export class DocumentedClass {
  method(): void {}
  field = 1;
}

export class UndocumentedClass {
  method(): void {}
}
