import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { AbortControllerRegistry } from './abort-controller-registry';
import type { UnknownState } from './state';

// ----------------------------------------
// Attach
// ----------------------------------------

export type Attach<Target, State> = (ctx: AttachContext<Target, State>) => void;

export interface AttachStore {
  readonly state: UnknownState;
  subscribe: (callback: () => void) => () => void;
}

export interface AttachContext<Target, State> {
  target: Target;
  signal: AbortSignal;
  store: AttachStore;
  get: () => Readonly<State>;
  set: (partial: Partial<State>) => void;
  reportError: (error: unknown) => void;
}

// ----------------------------------------
// State Context
// ----------------------------------------

export interface StateContext<Target> {
  /** Returns the current target. Throws if not attached. */
  target: () => Target;
  /**
   * Cancellation signals for async operations.
   *
   * - `signals.base` — Aborts on detach or reattach. Use for cleanup.
   * - `signals.supersede(key)` — Returns a signal that aborts when the same key
   *   is superseded or when base aborts. Use for operations that should cancel
   *   previous in-flight work (e.g., seek superseding seek).
   * - `signals.clear()` — Aborts all keyed signals. Use when starting fresh
   *   (e.g., loading a new source cancels pending seeks).
   */
  signals: AbortControllerRegistry;
  /** Read slice state before derived values. Safe inside action closures, not during `state()` init. */
  get: () => Readonly<Record<PropertyKey, unknown>>;
  /** Patch slice state before derived values. Safe inside action closures, not during `state()` init. */
  set: (partial: Record<PropertyKey, unknown>) => void;
}

// ----------------------------------------
// Derived Context
// ----------------------------------------

/** Read-only inputs available while an eager derived formula is evaluated. */
export interface DerivedContext<State> {
  /** Returns the immutable slice state before derived values. */
  get: () => Readonly<State>;
}

/** Formula map used to produce public derived state. */
export type DerivedDefinition<State, Derived> = {
  [Key in keyof Derived]: (ctx: DerivedContext<State>) => Derived[Key];
};

// ----------------------------------------
// Slice
// ----------------------------------------

export interface SliceConfig<Target, State, Derived = object> {
  /** Debug label. Used as `displayName` on selectors created from this slice. */
  name?: string;
  state: (ctx: StateContext<Target>) => State;
  /** Source-state keys whose current values survive detach. */
  preserve?: readonly PropertyKey[];
  /** Formulas evaluated from slice state before publication. */
  derived?: DerivedDefinition<State, Derived>;
  attach?: (ctx: AttachContext<Target, State>) => void;
}

export type Slice<Target, State, Derived = object> = SliceConfig<Target, State, Derived>;

export type AnySlice<Target = any> = Slice<Target, any, object>;

// ----------------------------------------
// Factory
// ----------------------------------------

type DerivedFunctions<State> = Record<string, (ctx: DerivedContext<State>) => unknown>;

type DerivedValues<Definitions extends Record<string, (...args: any[]) => unknown>> = {
  [Key in keyof Definitions]: ReturnType<Definitions[Key]>;
};

export interface SliceFactory<Target> {
  <State, const Definitions extends DerivedFunctions<State>>(
    config: Omit<SliceConfig<Target, State, DerivedValues<Definitions>>, 'derived'> & {
      derived: Definitions;
    }
  ): Slice<Target, State, DerivedValues<Definitions>>;
  <State>(config: Omit<SliceConfig<Target, State>, 'derived'> & { derived?: never }): Slice<Target, State>;
}

export function defineSlice<Target>(): SliceFactory<Target> {
  return ((config: SliceConfig<Target, unknown, unknown>) => config) as SliceFactory<Target>;
}

// ----------------------------------------
// Inference
// ----------------------------------------

export type InferSliceTarget<S> = S extends Slice<infer Target, any, any> ? Target : never;

/** Infer from the state factory so intersections with feature metadata preserve exact source state. */
export type InferSliceSourceState<S> = S extends { state: (...args: any[]) => infer State } ? State : never;

export type InferSliceDerivedState<S> = S extends Slice<any, any, infer Derived> ? Derived : never;

export type PublicSourceState<State> = Pick<State, Extract<keyof State, string>>;

export type InferSliceState<S> =
  S extends Slice<any, infer State, infer Derived> ? Simplify<PublicSourceState<State> & Derived> : never;

type IntersectSlices<Slices extends readonly AnySlice[], Value> = Slices extends readonly []
  ? object
  : Simplify<UnionToIntersection<Value>>;

export type UnionSliceSourceState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceSourceState<Slices[number]>
>;

export type UnionSliceDerivedState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceDerivedState<Slices[number]>
>;

export type UnionSliceState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceState<Slices[number]>
>;
