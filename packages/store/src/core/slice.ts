import type { Simplify, UnionToIntersection } from '@videojs/utils/types';
import type { Signals } from './signals';
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
  signals: Signals;
}

// ----------------------------------------
// Slice
// ----------------------------------------

export interface SliceConfig<Target, State> {
  state: (ctx: StateContext<Target>) => State;
  attach?: (ctx: AttachContext<Target, State>) => void;
}

export type Slice<Target, State> = SliceConfig<Target, State>;

export type AnySlice<Target = any> = Slice<Target, any>;

// ----------------------------------------
// Factory
// ----------------------------------------

export type SliceFactory<Target> = <State>(config: SliceConfig<Target, State>) => Slice<Target, State>;

export function defineSlice<Target>(): SliceFactory<Target> {
  return (config) => config;
}

// ----------------------------------------
// Inference
// ----------------------------------------

export type InferSliceTarget<S> = S extends Slice<infer Target, any> ? Target : never;

export type InferSliceState<S> = S extends Slice<any, infer State> ? State : never;

export type UnionSliceState<Slices extends AnySlice[]> = Simplify<UnionToIntersection<InferSliceState<Slices[number]>>>;
