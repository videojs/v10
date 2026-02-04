import { isNull, isObject } from '@videojs/utils/predicate';
import type { StoreCallbacks } from './config';
import { throwDestroyedError, throwNoTargetError } from './errors';
import { Signals } from './signals';
import type { AttachContext, Slice, StateContext } from './slice';
import type { StateChange, SubscribeOptions, UnknownState, WritableState } from './state';
import { createState } from './state';

const STORE_SYMBOL = Symbol('@videojs/store');

export interface StoreOptions<Target, State> extends StoreCallbacks<Target, State> {}

export function createStore<Target = unknown>(): <State>(
  slice: Slice<Target, State>,
  options?: StoreOptions<Target, State>
) => Store<Target, State> {
  return <State>(slice: Slice<Target, State>, options: StoreOptions<Target, State> = {}): Store<Target, State> => {
    type TargetStore = Store<Target, State>;

    // Closure state
    let target: Target | null = null;
    let destroyed = false;

    const setupAbort = new AbortController();
    const signals = new Signals();

    // Reactive state - initialized after building slice state
    let state: WritableState<State>;

    function validate() {
      if (destroyed) throwDestroyedError();
      if (!target) throwNoTargetError();
    }

    const initialState = slice.state({
      target: () => {
        validate();
        return target!;
      },
      signals,
    } satisfies StateContext<Target>);

    state = createState(initialState);

    const store = {
      [STORE_SYMBOL]: true,
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

    for (const key of Object.keys(initialState as object)) {
      Object.defineProperty(store, key, {
        get: () => state.current[key as keyof State],
        enumerable: true,
      });
    }

    try {
      options.onSetup?.({ store, signal: setupAbort.signal });
    } catch (error) {
      reportError(error);
    }

    return store;

    function attach(newTarget: Target): () => void {
      if (destroyed) throwDestroyedError();

      // Reset signals for new attachment (also cleans up previous if reattaching)
      signals.reset();
      target = newTarget;

      // Create attach context
      const attachContext: AttachContext<Target, State> = {
        target: newTarget,
        signal: signals.base,
        get: () => state.current,
        set: (partial) => state.patch(partial),
        reportError,
        store: {
          get state() {
            return state.current;
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
      state.patch(initialState);
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
  };
}

export function isStore(value: unknown): value is AnyStore {
  return isObject(value) && STORE_SYMBOL in value;
}

// ----------------------------------------
// Types
// ----------------------------------------

export interface BaseStore<Target = unknown, State = UnknownState> {
  [key: string]: unknown;
  readonly target: Target | null;
  readonly destroyed: boolean;
  readonly state: State;
  attach(target: Target): () => void;
  destroy(): void;
  subscribe(callback: StateChange, options?: SubscribeOptions): () => void;
}

export type Store<Target = unknown, State = UnknownState> = BaseStore<Target, State> & State;

export type AnyStore<Target = any> = BaseStore<Target, object>;

export type UnknownStore<Target = unknown> = Store<Target, UnknownState>;

export type InferStoreTarget<S extends AnyStore> = S extends Store<infer T, any> ? T : never;

export type InferStoreState<S extends AnyStore> = S extends Store<any, infer State> ? State : never;
