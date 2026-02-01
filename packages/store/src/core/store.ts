import type { EventLike } from '@videojs/utils/events';
import { isFunction, isNull, isObject } from '@videojs/utils/predicate';
import type { PendingTask, StoreConfig } from './config';
import { StoreError } from './errors';
import type {
  AnyFeature,
  AttachContext,
  StateFactoryContext,
  TaskContext,
  TaskHandler,
  TaskOptions,
  UnionFeatureState,
  UnionFeatureTarget,
} from './feature';
import { CANCEL_ALL, Queue } from './queue';
import type { RequestMeta, RequestMetaInit } from './request';
import { createRequestMeta, createRequestMetaFromEvent } from './request';
import type { StateChange, WritableState } from './state';
import { createState } from './state';

const STORE_SYMBOL = Symbol('@videojs/store');

export function createStore<Features extends AnyFeature[]>(config: StoreConfig<Features>): Store<Features> {
  type Target = UnionFeatureTarget<Features>;
  type State = UnionFeatureState<Features>;

  const { features } = config;

  // Closure state
  let target: Target | null = null;
  let destroyed = false;
  let attachAbort: AbortController | null = null;

  const setupAbort = new AbortController();
  const queue = new Queue();
  const pending: Record<string, PendingTask> = {};

  // Reactive state - initialized after building features
  let state: WritableState<State>;

  const stateFactoryContext: StateFactoryContext<Target> = {
    task: executeTask,
    target: () => {
      if (!target) throw new StoreError('NO_TARGET');
      return target;
    },
  };

  const initialState = createInitialState(stateFactoryContext);
  state = createState(initialState);

  const store = {
    [STORE_SYMBOL]: true,
    get target() {
      return target;
    },
    get destroyed() {
      return destroyed;
    },
    get pending() {
      return pending;
    },
    get state() {
      return state.current;
    },
    attach,
    destroy,
    subscribe,
    meta,
  } as unknown as Store<Features>;

  for (const key of Object.keys(initialState)) {
    Object.defineProperty(store, key, {
      get: () => (state.current as Record<string, unknown>)[key],
      enumerable: true,
    });
  }

  // Proxy returned by meta() - wraps action calls to clear currentMeta after invocation
  let currentMeta: RequestMeta | null = null;
  const metaProxy = new Proxy(store, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);

      if (!isFunction(value)) return value;

      return (...args: unknown[]) => {
        try {
          return (value as (...args: unknown[]) => unknown)(...args);
        } finally {
          currentMeta = null;
        }
      };
    },
  });

  try {
    config.onSetup?.({ store, signal: setupAbort.signal });
  } catch (error) {
    handleError(error);
  }

  return store;

  function attach(newTarget: Target): () => void {
    if (destroyed) throw new StoreError('DESTROYED');

    attachAbort?.abort();
    target = newTarget;
    attachAbort = new AbortController();
    const signal = attachAbort.signal;

    // Create attach context once, share across all features
    const attachContext: AttachContext<Target, State> = {
      target: newTarget,
      signal,
      get: () => state.current,
      set: (partial) => state.patch(partial),
    };

    for (const feature of features) {
      try {
        feature.attach?.(attachContext);
      } catch (error) {
        handleError(error);
      }
    }

    try {
      config.onAttach?.({ store, target: newTarget, signal });
    } catch (error) {
      handleError(error);
    }

    return detach;
  }

  function detach(): void {
    if (isNull(target)) return;
    attachAbort?.abort();
    attachAbort = null;
    target = null;
    queue.abort();
    state.patch(initialState);
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    detach();
    setupAbort.abort();
    queue.destroy();
  }

  function subscribe(callback: StateChange): () => void {
    return state.subscribe(callback);
  }

  function meta(eventOrMeta: EventLike | RequestMetaInit): Store<Features> {
    currentMeta =
      'isTrusted' in eventOrMeta
        ? createRequestMetaFromEvent(eventOrMeta as EventLike)
        : createRequestMeta(eventOrMeta as RequestMetaInit);
    return metaProxy as Store<Features>;
  }

  function createInitialState(ctx: StateFactoryContext<Target>): State {
    const result: Record<string, unknown> = {};

    for (const feature of features) {
      const featureResult = feature.state(ctx);
      Object.assign(result, featureResult);
    }

    return result as State;
  }

  async function executeTask<Output>(handler: TaskHandler<Target, State, Output>): Promise<Awaited<Output>>;
  async function executeTask<Output>(options: TaskOptions<Target, State, Output>): Promise<Awaited<Output>>;
  async function executeTask<Output>(
    handlerOrOptions: TaskHandler<Target, State, Output> | TaskOptions<Target, State, Output>
  ): Promise<Awaited<Output>> {
    if (destroyed) throw new StoreError('DESTROYED');

    const options: TaskOptions<Target, State, Output> = isFunction(handlerOrOptions)
      ? { handler: handlerOrOptions }
      : handlerOrOptions;

    const { key, mode = 'exclusive', cancels, handler } = options;

    const meta = currentMeta;
    currentMeta = null;

    if (cancels) {
      for (const cancelKey of cancels) {
        if (cancelKey === CANCEL_ALL) {
          queue.abort();
        } else {
          queue.abort(cancelKey);
        }
      }
    }

    if (key) {
      pending[key as string] = { key, meta, startedAt: Date.now() };
      config.onTaskStart?.({ key, meta });
    }

    const queueHandler = async ({ signal }: { signal: AbortSignal }) => {
      if (!target) throw new StoreError('NO_TARGET');

      const ctx: TaskContext<Target, State> = {
        target,
        signal,
        get: () => state.current,
        meta,
      };

      return handler(ctx);
    };

    try {
      const result = await queue.enqueue({
        key: key ?? Symbol('@videojs/task'),
        mode,
        handler: queueHandler,
      });

      if (key) {
        delete pending[key as string];
        config.onTaskEnd?.({ key, meta });
      }

      return result as Awaited<Output>;
    } catch (error) {
      if (key) {
        delete pending[key as string];
        config.onTaskEnd?.({ key, meta, error });
      }

      handleError(error);
      throw error;
    }
  }

  function handleError(error: unknown): void {
    if (config.onError) {
      config.onError({ store, error });
    } else {
      console.error('[vjs-store]', error);
    }
  }
}

export function isStore(value: unknown): value is AnyStore {
  return isObject(value) && STORE_SYMBOL in value;
}

// ----------------------------------------
// Types
// ----------------------------------------

export interface StoreAPI<Target, Features extends AnyFeature<Target>[]> {
  readonly target: Target | null;
  readonly destroyed: boolean;
  readonly pending: Readonly<Record<string, PendingTask>>;
  readonly state: UnionFeatureState<Features>;
  attach(target: Target): () => void;
  destroy(): void;
  subscribe(callback: StateChange): () => void;
  meta(eventOrMeta: EventLike | RequestMetaInit): this;
}

export type Store<Features extends AnyFeature[]> = StoreAPI<UnionFeatureTarget<Features>, Features> &
  UnionFeatureState<Features>;

export type AnyStore<Target = any> = StoreAPI<Target, AnyFeature<Target>[]>;

export type InferStoreTarget<S extends AnyStore> = S extends StoreAPI<infer Target, any> ? Target : never;

export type InferStoreFeatures<S extends AnyStore> = S extends StoreAPI<any, infer Features> ? Features : never;

export type InferStoreState<S extends AnyStore> = UnionFeatureState<InferStoreFeatures<S>>;
