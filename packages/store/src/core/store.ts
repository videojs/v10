import { isNull, isObject, isFunction } from '@videojs/utils/predicate';

import { AbortControllerRegistry } from './abort-controller-registry';
import type { StoreCallbacks } from './config';
import { throwDestroyedError, throwNoTargetError } from './errors';
import type {
  AnySlice,
  AttachContext,
  InferSliceDerivedState,
  InferSliceSourceState,
  InferSliceState,
  Slice,
  StateContext,
} from './slice';
import type { StateChange, State as StateContainer, SubscribeOptions, UnknownState, WritableState } from './state';
import { createState } from './state';
import type { StoreValue } from './value';

const STORE_SYMBOL = Symbol.for('@videojs/store');
const hasOwnProp = Object.prototype.hasOwnProperty;

export interface StoreOptions<Target, State> extends StoreCallbacks<Target, State> {}

export interface StoreFactory<Target> {
  <S extends AnySlice<Target>>(
    slice: S,
    options?: StoreOptions<Target, InferSliceState<S>>
  ): Store<Target, InferSliceState<S>>;
  <State>(slice: Slice<Target, State>, options?: StoreOptions<Target, State>): Store<Target, State>;
}

export function createStore<Target = unknown>() {
  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (<
    S extends AnySlice<Target>,
  >(
    slice: S,
    options: StoreOptions<Target, InferSliceState<S>> = {}
  ): Store<Target, InferSliceState<S>> => {
    type SourceState = InferSliceSourceState<S>;
    type DerivedState = InferSliceDerivedState<S>;
    type PublicState = InferSliceState<S>;
    type TargetStore = Store<Target, PublicState>;

    // Closure state
    let target: Target | null = null;
    let destroyed = false;

    const setupAbort = new AbortController();
    const signals = new AbortControllerRegistry();

    let sourceState: Readonly<SourceState>;

    // Reactive public state - initialized after building slice source state.
    let state: WritableState<PublicState>;

    function validate() {
      if (destroyed) throwDestroyedError();
      if (!target) throwNoTargetError();
    }

    const initialSourceState = freezeCopy(
      slice.state({
        target: () => {
          validate();
          return target!;
        },
        signals,
        // SAFETY: SourceState is the slice-owned state contract exposed through StateContext's runtime value domain.
        get: () => sourceState as Readonly<Record<PropertyKey, StoreValue>>,
        set: (partial) =>
          setSource(
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ partial as Partial<SourceState>
          ),
      } satisfies StateContext<Target>)
    );

    sourceState = initialSourceState;
    const initialDerivedState = derive(sourceState);
    const initialPublicState = publish(sourceState, initialDerivedState);
    state = createState(initialPublicState);

    const storeBase: BaseStore<Target, PublicState> & { readonly [STORE_SYMBOL]: boolean } = {
      [STORE_SYMBOL]: true,
      get $state() {
        return state;
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
    };

    // Seed each public state key so the object has the complete TargetStore
    // contract before replacing those values with live getters below.
    const store: TargetStore = Object.assign(storeBase, initialPublicState);

    for (const key of Object.keys(
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ state.current as object
    )) {
      Object.defineProperty(store, key, {
        get: () =>
          state.current[
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ key as keyof PublicState
          ],
        enumerable: true,
      });
    }

    // Private symbol-backed source actions remain available to feature-owned
    // configuration adapters without becoming part of the public state snapshot.
    for (const key of Object.getOwnPropertySymbols(
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ sourceState as object
    )) {
      if (
        !isFunction(
          sourceState[
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ key as keyof SourceState
          ]
        )
      )
        continue;
      Object.defineProperty(store, key, {
        get: () =>
          sourceState[
            /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ key as keyof SourceState
          ],
      });
    }

    try {
      options.onSetup?.({ store, signal: setupAbort.signal });
    } catch (error) {
      reportError(error);
    }

    return store;

    function derive(source: Readonly<SourceState>): DerivedState {
      const result: Record<string, StoreValue> = {};
      // SAFETY: S carries the SourceState and DerivedState contracts inferred from this slice.
      const definitions = slice.derived as
        | Record<string, (ctx: { get: () => Readonly<SourceState> }) => StoreValue>
        | undefined;
      if (!definitions) {
        // SAFETY: A slice without derived definitions has an empty DerivedState.
        return result as DerivedState;
      }

      const ctx = { get: () => source };

      for (const key of Object.keys(definitions)) {
        result[key] = definitions[key]!(ctx);
      }

      return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ result as DerivedState;
    }

    function publish(source: Readonly<SourceState>, derived: DerivedState): PublicState {
      const result: Record<string, StoreValue> = {};

      // Object.keys intentionally excludes symbol-backed internal source state.
      for (const key of Object.keys(source as object)) {
        // SAFETY: Object.keys(source) returns only string keys owned by SourceState.
        const sourceKey = key as keyof SourceState;
        // SAFETY: StoreValue is the runtime domain accepted by slice state.
        result[key] = source[sourceKey] as StoreValue;
      }

      // SAFETY: result contains every public string source key plus every derived key.
      return Object.assign(result, derived) as PublicState;
    }

    function setSource(partial: Partial<SourceState>): void {
      const patched = patchSource(sourceState, partial);
      if (!patched) return;

      // Derive before committing so a thrown formula leaves every snapshot unchanged.
      const nextDerived = derive(patched.next);
      sourceState = patched.next;
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
            return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ state.current as UnknownState;
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

      // SAFETY: Spreading initialSourceState creates the mutable SourceState copy used for reset.
      const resetState = {
        ...initialSourceState,
      } as SourceState;
      for (const preservedKey of slice.preserve ?? []) {
        // SAFETY: Slice preserve entries name keys in its own SourceState contract.
        const key = preservedKey as keyof SourceState;
        resetState[key] = sourceState[key];
      }
      setSource(resetState);
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

    function reportError<Failure>(error: Failure): void {
      if (options.onError) {
        options.onError({ store, error });
      } else {
        console.error('[vjs-store]', error);
      }
    }
  }) satisfies StoreFactory<Target> satisfies StoreFactory<Target>;
}

function freezeCopy<T>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}

function patchSource<State>(current: Readonly<State>, partial: Partial<State>): { next: Readonly<State> } | null {
  const next = /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {
    ...current,
  } as State;
  let changed = false;

  for (const key of /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ Reflect.ownKeys(
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ partial as object
  ) as (keyof State)[]) {
    if (!hasOwnProp.call(partial, key)) continue;
    const value = partial[key];
    if (Object.is(current[key], value)) continue;
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (
      next satisfies { -readonly [Key in keyof State]: State[Key] }
    )[key] = value!;
    changed = true;
  }

  return changed ? { next: Object.freeze(next) } : null;
}

export function isStore<Value>(value: Value): value is Value & AnyStore {
  return isObject(value) && STORE_SYMBOL in value;
}

// ----------------------------------------
// Types
// ----------------------------------------

export interface BaseStore<Target = unknown, State = UnknownState> {
  readonly $state: StateContainer<State>;
  readonly target: Target | null;
  readonly destroyed: boolean;
  readonly state: Readonly<State>;
  attach(target: Target): () => void;
  destroy(): void;
  subscribe(callback: StateChange, options?: SubscribeOptions): () => void;
}

export type Store<Target = unknown, State = UnknownState> = BaseStore<Target, State> & State;

export type AnyStore<Target = any> = BaseStore<Target, object>;

export type UnknownStore<Target = unknown> = Store<Target, UnknownState>;

export type InferStoreTarget<S extends AnyStore> = S extends { readonly target: (infer Target) | null }
  ? Target
  : never;

export type InferStoreState<S extends AnyStore> = S extends { readonly state: infer State } ? State : never;
