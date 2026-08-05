import { isNull, isObject } from '@videojs/utils/predicate';
import { AbortControllerRegistry } from './abort-controller-registry';
import type { StoreCallbacks } from './config';
import { throwDestroyedError, throwNoTargetError } from './errors';
import type {
  AnySlice,
  AttachContext,
  ConfigController,
  ConfigPatch,
  InferSliceConfig,
  InferSliceDerivedState,
  InferSliceSourceState,
  InferSliceState,
  StateContext,
} from './slice';
import type { StateChange, State as StateContainer, SubscribeOptions, UnknownState, WritableState } from './state';
import { createState } from './state';

const STORE_SYMBOL = Symbol.for('@videojs/store');
const hasOwnProp = Object.prototype.hasOwnProperty;

export interface StoreOptions<Target, State, Config = object> extends StoreCallbacks<Target, State> {
  /** Initial provider configuration overlaid on the slice-declared defaults. */
  config?: ConfigPatch<Config>;
}

export interface StoreFactory<Target> {
  <S extends AnySlice<Target>>(
    slice: S,
    options?: StoreOptions<Target, InferSliceState<S>, InferSliceConfig<S>>
  ): Store<Target, InferSliceState<S>, InferSliceConfig<S>>;
  <State>(slice: import('./slice').Slice<Target, State>, options?: StoreOptions<Target, State>): Store<Target, State>;
}

export function createStore<Target = unknown>(): StoreFactory<Target> {
  return (<S extends AnySlice<Target>>(
    slice: S,
    options: StoreOptions<Target, InferSliceState<S>, InferSliceConfig<S>> = {}
  ): Store<Target, InferSliceState<S>, InferSliceConfig<S>> => {
    type SourceState = InferSliceSourceState<S>;
    type DerivedState = InferSliceDerivedState<S>;
    type PublicState = InferSliceState<S>;
    type Config = InferSliceConfig<S>;
    type TargetStore = Store<Target, PublicState, Config>;

    // Closure state
    let target: Target | null = null;
    let destroyed = false;

    const setupAbort = new AbortController();
    const signals = new AbortControllerRegistry();

    const initialConfig = freezeCopy((slice.config ?? {}) as Config);
    let configState = patchConfig(initialConfig, initialConfig, options.config)?.next ?? initialConfig;
    let sourceState: Readonly<SourceState>;

    // Reactive public state - initialized after building slice source state.
    let state: WritableState<PublicState>;

    function validate() {
      if (destroyed) throwDestroyedError();
      if (!target) throwNoTargetError();
    }

    const configController: ConfigController<Config> = {
      get: () => configState,
      set: setConfig,
    };

    const initialSourceState = freezeCopy(
      slice.state({
        target: () => {
          validate();
          return target!;
        },
        config: configController,
        signals,
        get: () => sourceState as Readonly<Record<PropertyKey, unknown>>,
        set: (partial) => setSource(partial as Partial<SourceState>),
      } satisfies StateContext<Target, Config>)
    );

    sourceState = initialSourceState;
    const initialDerivedState = derive(sourceState, configState);
    state = createState(publish(sourceState, initialDerivedState));

    const store = {
      [STORE_SYMBOL]: true,
      get $state() {
        return state;
      },
      get $config() {
        return configController;
      },
      get target() {
        return target;
      },
      get destroyed() {
        return destroyed;
      },
      get state() {
        return state.current;
      },
      attach,
      destroy,
      subscribe,
    } as unknown as TargetStore;

    for (const key of Object.keys(state.current as object)) {
      Object.defineProperty(store, key, {
        get: () => state.current[key as keyof PublicState],
        enumerable: true,
      });
    }

    try {
      options.onSetup?.({ store, signal: setupAbort.signal });
    } catch (error) {
      reportError(error);
    }

    return store;

    function derive(source: Readonly<SourceState>, config: Readonly<Config>): DerivedState {
      const result: Record<string, unknown> = {};
      const definitions = slice.derived as
        | Record<
            string,
            (ctx: { get: () => Readonly<SourceState>; config: { get: () => Readonly<Config> } }) => unknown
          >
        | undefined;
      if (!definitions) return result as DerivedState;

      const ctx = {
        get: () => source,
        config: { get: () => config },
      };

      for (const key of Object.keys(definitions)) {
        result[key] = definitions[key]!(ctx);
      }

      return result as DerivedState;
    }

    function publish(source: Readonly<SourceState>, derived: DerivedState): PublicState {
      const result: Record<string, unknown> = {};

      // Object.keys intentionally excludes symbol-backed internal source state.
      for (const key of Object.keys(source as object)) {
        result[key] = source[key as keyof SourceState];
      }

      return Object.assign(result, derived) as PublicState;
    }

    function setSource(partial: Partial<SourceState>): void {
      const patched = patchSource(sourceState, partial);
      if (!patched) return;

      // Derive before committing so a thrown formula leaves every snapshot unchanged.
      const nextDerived = derive(patched.next, configState);
      sourceState = patched.next;
      state.replace(publish(sourceState, nextDerived));
    }

    function setConfig(partial: ConfigPatch<Config>): void {
      const patched = patchConfig(configState, initialConfig, partial);
      if (!patched) return;

      // Derive before committing so a thrown formula leaves every snapshot unchanged.
      const nextDerived = derive(sourceState, patched.next);
      configState = patched.next;
      state.replace(publish(sourceState, nextDerived));
    }

    function attach(newTarget: Target): () => void {
      if (destroyed) throwDestroyedError();

      // Reset signals for new attachment (also cleans up previous if reattaching)
      signals.reset();
      target = newTarget;

      const attachContext: AttachContext<Target, SourceState> = {
        target: newTarget,
        signal: signals.base,
        get: () => sourceState,
        // Attach itself has an error boundary, but event listeners keep this
        // context after attach returns and must report update errors too.
        set: (partial) => {
          try {
            setSource(partial);
          } catch (error) {
            reportError(error);
          }
        },
        reportError,
        store: {
          get state() {
            return state.current as UnknownState;
          },
          subscribe,
        },
      };

      try {
        slice.attach?.(attachContext);
      } catch (error) {
        reportError(error);
      }

      try {
        options.onAttach?.({
          store,
          target: newTarget,
          signal: signals.base,
        });
      } catch (error) {
        reportError(error);
      }

      return detach;
    }

    function detach(): void {
      if (isNull(target)) return;
      signals.reset();
      target = null;
      setSource(initialSourceState as SourceState);
    }

    function destroy(): void {
      if (destroyed) return;
      destroyed = true;
      detach();
      setupAbort.abort();
    }

    function subscribe(callback: StateChange, options?: SubscribeOptions): () => void {
      return state.subscribe(callback, options);
    }

    function reportError(error: unknown): void {
      if (options.onError) {
        options.onError({ store, error });
      } else {
        console.error('[vjs-store]', error);
      }
    }
  }) as StoreFactory<Target>;
}

function freezeCopy<T>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

function patchSource<State>(current: Readonly<State>, partial: Partial<State>): { next: Readonly<State> } | null {
  const next = { ...current } as State;
  let changed = false;

  for (const key of Reflect.ownKeys(partial as object) as (keyof State)[]) {
    if (!hasOwnProp.call(partial, key)) continue;
    const value = partial[key];
    if (Object.is(current[key], value)) continue;
    (next as { -readonly [Key in keyof State]: State[Key] })[key] = value!;
    changed = true;
  }

  return changed ? { next: Object.freeze(next) } : null;
}

function patchConfig<Config>(
  current: Readonly<Config>,
  initial: Readonly<Config>,
  partial: ConfigPatch<Config> | undefined
): { next: Readonly<Config> } | null {
  if (!partial) return null;

  const next = { ...current } as Config;
  let changed = false;

  for (const key of Reflect.ownKeys(partial as object) as (keyof Config)[]) {
    if (!hasOwnProp.call(partial, key)) continue;
    const supplied = partial[key];
    const value = supplied === undefined ? initial[key] : supplied;
    if (Object.is(current[key], value)) continue;
    (next as { -readonly [Key in keyof Config]: Config[Key] })[key] = value as Config[keyof Config];
    changed = true;
  }

  return changed ? { next: Object.freeze(next) } : null;
}

export function isStore(value: unknown): value is AnyStore {
  return isObject(value) && STORE_SYMBOL in value;
}

// ----------------------------------------
// Types
// ----------------------------------------

export interface BaseStore<Target = unknown, State = UnknownState, Config = object> {
  [key: string]: unknown;
  readonly $state: StateContainer<State>;
  /**
   * Low-level provider adapter infrastructure for reading and patching declared
   * feature config. Consumers should prefer feature-authored state actions.
   */
  readonly $config: ConfigController<Config>;
  readonly target: Target | null;
  readonly destroyed: boolean;
  readonly state: State;
  attach(target: Target): () => void;
  destroy(): void;
  subscribe(callback: StateChange, options?: SubscribeOptions): () => void;
}

export type Store<Target = unknown, State = UnknownState, Config = object> = BaseStore<Target, State, Config> & State;

export type AnyStore<Target = any> = BaseStore<Target, object, any>;

export type UnknownStore<Target = unknown> = Store<Target, UnknownState>;

export type InferStoreTarget<S extends AnyStore> = S extends { readonly target: infer Target | null } ? Target : never;

export type InferStoreState<S extends AnyStore> = S extends { readonly state: infer State } ? State : never;

export type InferStoreConfig<S extends AnyStore> = S['$config'] extends ConfigController<infer Config> ? Config : never;
