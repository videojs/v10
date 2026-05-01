import type { Signal } from '../signals/primitives';

/**
 * Cleanup returned by a behavior. Behaviors may return:
 * - `void` / `undefined` — no cleanup needed
 * - A function — called on destroy (may return a Promise)
 * - An object with `destroy()` — called on destroy (may return a Promise)
 */
export type BehaviorCleanup = void | (() => void | Promise<void>) | { destroy(): void | Promise<void> };

/**
 * A signal map keyed by the fields of `S`. Each field is a discrete signal.
 *
 * Optional fields on `S` map to required signal slots whose value type
 * includes `undefined`, ensuring every key has a signal even when the
 * underlying value is absent.
 */
export type StateSignals<S extends object> = { [K in keyof S]-?: Signal<S[K]> };

/**
 * A signal map keyed by the fields of `C`. Each field is a discrete signal
 * for a platform object or actor reference.
 */
export type ContextSignals<C extends object> = { [K in keyof C]-?: Signal<C[K]> };

/**
 * The deps object passed to each behavior by the composition.
 *
 * - `state` — discrete signal map for state fields (reactive data)
 * - `context` — discrete signal map for platform objects and actor references
 * - `config` — static configuration, passed once at composition creation
 */
export interface BehaviorDeps<S extends object, C extends object, Cfg extends object> {
  state: StateSignals<S>;
  context: ContextSignals<C>;
  config: Cfg;
}

/**
 * A behavior is a function that receives deps (state, context, config)
 * and returns an optional cleanup handle.
 *
 * Each behavior declares its own state/context/config shape via its
 * parameter type. The composition's types are determined by the engine.
 */
export type Behavior<S extends object, C extends object, Cfg extends object> = (
  deps: BehaviorDeps<S, C, Cfg>
) => BehaviorCleanup;

/**
 * A composition of behaviors with shared state and context signal maps.
 */
export interface Composition<S extends object, C extends object> {
  state: StateSignals<S>;
  context: ContextSignals<C>;
  destroy(): Promise<void>;
}

/**
 * Options for `createComposition`. The caller constructs the state and
 * context signal maps and passes them in — this is the "create signals
 * from the outside" stage of the discrete-signals migration. A later
 * stage will derive these from per-behavior key declarations.
 */
export interface CompositionOptions<S extends object, C extends object, Cfg extends object> {
  /** Static configuration passed to every behavior. */
  config?: Cfg;
  /** State signal map — one signal per state field. */
  state: StateSignals<S>;
  /** Context signal map — one signal per context field. */
  context: ContextSignals<C>;
}

/**
 * Create a composition by wiring behaviors to pre-built signal maps.
 *
 * `createComposition` is generic — it knows nothing about HLS, DASH,
 * or any specific protocol. It hands each behavior the shared state
 * and context signal maps and returns the composition interface.
 *
 * @example
 * ```ts
 * const state = {
 *   currentTime: signal<number | undefined>(undefined),
 *   // ...
 * };
 * const context = {
 *   mediaElement: signal<HTMLMediaElement | undefined>(undefined),
 *   // ...
 * };
 *
 * const composition = createComposition<MyState, MyContext, MyConfig>(
 *   [behavior1, behavior2],
 *   { config, state, context }
 * );
 * ```
 */
export function createComposition<S extends object, C extends object, Cfg extends object>(
  behaviors: readonly Behavior<S, C, Cfg>[],
  options: CompositionOptions<S, C, Cfg>
): Composition<S, C> {
  const { state, context, config } = options;
  const deps: BehaviorDeps<S, C, Cfg> = {
    state,
    context,
    config: config ?? ({} as Cfg),
  };
  const cleanups = behaviors.map((behavior) => behavior(deps));

  return {
    state,
    context,
    async destroy() {
      const results: (void | Promise<void>)[] = [];
      for (const cleanup of cleanups) {
        if (cleanup == null) continue;
        if (typeof cleanup === 'function') {
          results.push(cleanup());
        } else if ('destroy' in cleanup) {
          results.push(cleanup.destroy());
        }
      }
      await Promise.all(results);
      // Reset every signal to undefined as a final cleanup, matching the
      // prior post-destroy `owners.set({})` semantics. A later stage will
      // move per-signal cleanup into the behaviors that own the writes.
      for (const key in state) {
        (state[key] as Signal<unknown>).set(undefined);
      }
      for (const key in context) {
        (context[key] as Signal<unknown>).set(undefined);
      }
    },
  };
}
