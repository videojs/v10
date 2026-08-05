import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { AbortControllerRegistry } from './abort-controller-registry';
import type { UnknownState } from './state';

// ----------------------------------------
// Config
// ----------------------------------------

/** A shallow config update. Explicit `undefined` restores a key's declared initial value. */
export type ConfigPatch<Config> = {
  [Key in keyof Config]?: Config[Key] | undefined;
};

/** Read and patch the provider-lifetime configuration declared by selected slices. */
export interface ConfigController<Config> {
  get: () => Readonly<Config>;
  set: (partial: ConfigPatch<Config>) => void;
}

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

export interface StateContext<Target, Config = object> {
  /** Returns the current target. Throws if not attached. */
  target: () => Target;
  /** User-defined, provider-lifetime configuration. */
  config: ConfigController<Config>;
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
export interface DerivedContext<State, Config> {
  /** Returns the immutable slice state before derived values. */
  get: () => Readonly<State>;
  /** Read-only access to the immutable provider configuration snapshot. */
  config: Pick<ConfigController<Config>, 'get'>;
}

/** Formula map used to produce public derived state. */
export type DerivedDefinition<State, Config, Derived> = {
  [Key in keyof Derived]: (ctx: DerivedContext<State, Config>) => Derived[Key];
};

// ----------------------------------------
// Slice
// ----------------------------------------

export interface SliceConfig<Target, State, Config = object, Derived = object> {
  /** Debug label. Used as `displayName` on selectors created from this slice. */
  name?: string;
  /** Initial provider-lifetime configuration. */
  config?: Config;
  state: (ctx: StateContext<Target, Config>) => State;
  /** Formulas evaluated from slice state and provider config before publication. */
  derived?: DerivedDefinition<State, Config, Derived>;
  attach?: (ctx: AttachContext<Target, State>) => void;
}

export type Slice<Target, State, Config = object, Derived = object> = SliceConfig<Target, State, Config, Derived>;

export type AnySlice<Target = any> = Slice<Target, any, any, object>;

// ----------------------------------------
// Factory
// ----------------------------------------

type DerivedFunctions<State, Config> = Record<string, (ctx: DerivedContext<State, Config>) => unknown>;

type DerivedValues<Definitions extends Record<string, (...args: any[]) => unknown>> = {
  [Key in keyof Definitions]: ReturnType<Definitions[Key]>;
};

export interface SliceFactory<Target, Config = object> {
  <State, const Definitions extends DerivedFunctions<State, Config>>(
    config: Omit<SliceConfig<Target, State, Config, DerivedValues<Definitions>>, 'derived'> & {
      derived: Definitions;
    }
  ): Slice<Target, State, Config, DerivedValues<Definitions>>;
  <State>(
    config: Omit<SliceConfig<Target, State, Config>, 'derived'> & { derived?: never }
  ): Slice<Target, State, Config>;
}

export function defineSlice<Target, Config = object>(): SliceFactory<Target, Config> {
  return ((config: SliceConfig<Target, unknown, Config, unknown>) => config) as SliceFactory<Target, Config>;
}

// ----------------------------------------
// Inference
// ----------------------------------------

export type InferSliceTarget<S> = S extends Slice<infer Target, any, any, any> ? Target : never;

export type InferSliceSourceState<S> = S extends Slice<any, infer State, any, any> ? State : never;

export type InferSliceConfig<S> = S extends Slice<any, any, infer Config, any> ? Config : never;

export type InferSliceDerivedState<S> = S extends Slice<any, any, any, infer Derived> ? Derived : never;

export type PublicSourceState<State> = Pick<State, Extract<keyof State, string>>;

export type InferSliceState<S> =
  S extends Slice<any, infer State, any, infer Derived> ? Simplify<PublicSourceState<State> & Derived> : never;

type IntersectSlices<Slices extends readonly AnySlice[], Value> = Slices extends readonly []
  ? object
  : Simplify<UnionToIntersection<Value>>;

export type UnionSliceSourceState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceSourceState<Slices[number]>
>;

export type UnionSliceConfig<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceConfig<Slices[number]>
>;

export type UnionSliceDerivedState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceDerivedState<Slices[number]>
>;

export type UnionSliceState<Slices extends readonly AnySlice[]> = IntersectSlices<
  Slices,
  InferSliceState<Slices[number]>
>;
