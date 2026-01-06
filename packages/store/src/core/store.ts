import type { PendingTask, Task, TaskContext } from './queue';
import type { RequestMeta, RequestMetaInit, ResolvedRequestConfig } from './request';
import type { AnySlice, Slice, UnionSliceRequests, UnionSliceState, UnionSliceTarget, UnionSliceTasks } from './slice';
import type { StateFactory } from './state';

import { getSelectorKeys } from '@videojs/utils/object';
import { isNull } from '@videojs/utils/predicate';

import { StoreError } from './errors';
import { Queue } from './queue';
import { createRequestMeta, resolveRequestCancelKeys, resolveRequestKey } from './request';
import { State } from './state';

export class Store<Target, Slices extends AnySlice<Target>[] = AnySlice<Target>[]> {
  readonly #config: StoreConfig<Target, Slices>;
  readonly #slices: Slices;
  readonly #queue: Queue<UnionSliceTasks<Slices>>;
  readonly #state: State<UnionSliceState<Slices>>;
  readonly #request: UnionSliceRequests<Slices>;
  readonly #requestConfigs: Map<string, ResolvedRequestConfig<Target>>;
  readonly #setupAbort = new AbortController();

  #target: Target | null = null;
  #attachAbort: AbortController | null = null;
  #destroyed = false;

  constructor(config: StoreConfig<Target, Slices>) {
    this.#config = config;
    this.#slices = config.slices;

    this.#queue = config.queue ?? new Queue<UnionSliceTasks<Slices>>();

    const factory = config.state ?? (initial => new State(initial));
    this.#state = factory(this.#createInitialState());

    this.#requestConfigs = this.#buildRequestConfigs();
    this.#request = this.#buildRequestProxy();

    try {
      config.onSetup?.({
        store: this,
        signal: this.#setupAbort.signal,
      });
    } catch (error) {
      this.#handleError({ error });
    }
  }

  // ----------------------------------------
  // Public Getters
  // ----------------------------------------

  get target(): Target | null {
    return this.#target;
  }

  get state(): UnionSliceState<Slices> {
    return this.#state.value;
  }

  get request(): UnionSliceRequests<Slices> {
    return this.#request;
  }

  get queue(): Queue<UnionSliceTasks<Slices>> {
    return this.#queue;
  }

  get slices(): Slices {
    return this.#slices;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  // ----------------------------------------
  // Attach / Detach
  // ----------------------------------------

  attach(newTarget: Target): () => void {
    if (this.#destroyed) {
      throw new StoreError('DESTROYED');
    }

    this.#attachAbort?.abort();

    this.#target = newTarget;
    this.#attachAbort = new AbortController();
    const signal = this.#attachAbort.signal;

    this.#resetState();

    for (const slice of this.#slices) {
      try {
        const update = this.#createUpdate(slice);
        slice.subscribe({ target: newTarget, update, signal });
      } catch (error) {
        this.#handleError({ error });
      }
    }

    this.#syncAllSlices();

    try {
      this.#config.onAttach?.({
        store: this,
        target: newTarget,
        signal,
      });
    } catch (error) {
      this.#handleError({ error });
    }

    return () => this.#detach();
  }

  #createUpdate<State extends object>(slice: Slice<Target, State, any>) {
    return (partial?: Partial<State>) => {
      const target = this.#target;
      if (!target) return;

      try {
        if (partial === undefined) {
          this.#syncSlice(slice, target);
        } else {
          this.#state.patch(partial as Partial<UnionSliceState<Slices>>);
        }
      } catch (error) {
        this.#handleError({ error });
      }
    };
  }

  #detach(): void {
    if (isNull(this.#target)) return;
    this.#attachAbort?.abort();
    this.#attachAbort = null;
    this.#target = null;
    this.#queue.abort();
    this.#resetState();
  }

  // ----------------------------------------
  // Subscribe
  // ----------------------------------------

  subscribe(listener: (state: UnionSliceState<Slices>) => void): () => void;
  subscribe<Selected>(
    selector: Selector<UnionSliceState<Slices>, Selected>,
    listener: (selected: Selected) => void,
    options?: SubscribeOptions<Selected>
  ): () => void;
  subscribe<Selected>(
    selectorOrListener: ((state: UnionSliceState<Slices>) => void) | Selector<UnionSliceState<Slices>, Selected>,
    maybeListener?: (selected: Selected) => void,
    options?: SubscribeOptions<Selected>,
  ): () => void {
    if (!maybeListener) {
      return this.#state.subscribe(selectorOrListener);
    }

    const selector = selectorOrListener as Selector<UnionSliceState<Slices>, Selected>;
    const listener = maybeListener;
    const equalityFn = options?.equalityFn ?? Object.is;

    let prev = selector(this.#state.value);
    const handler = (state: UnionSliceState<Slices>) => {
      const next = selector(state);
      if (!equalityFn(prev, next)) {
        prev = next;
        listener(next);
      }
    };

    const keys = getSelectorKeys(selector, this.#state.value);

    if (keys) {
      return this.#state.subscribeKeys(
        keys as (keyof UnionSliceState<Slices>)[],
        handler as (state: Pick<UnionSliceState<Slices>, keyof UnionSliceState<Slices>>) => void,
      );
    }

    return this.#state.subscribe(handler);
  }

  // ----------------------------------------
  // Destroy
  // ----------------------------------------

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#detach();
    this.#setupAbort.abort();
    this.#queue.destroy();
  }

  // ----------------------------------------
  // State
  // ----------------------------------------

  #syncAllSlices(): void {
    const target = this.#target;
    if (!target) return;

    for (const slice of this.#slices) {
      this.#syncSlice(slice, target);
    }
  }

  #syncSlice(slice: AnySlice<Target>, target: Target): void {
    try {
      const snapshot = slice.getSnapshot({
        target,
        initialState: slice.initialState,
      });

      this.#state.patch(snapshot);
    } catch (error) {
      this.#handleError({ error });
    }
  }

  #createInitialState(): UnionSliceState<Slices> {
    const initialState: Record<string, unknown> = {};

    for (const slice of this.#slices) {
      Object.assign(initialState, slice.initialState);
    }

    return initialState as UnionSliceState<Slices>;
  }

  #resetState(): void {
    this.#state.patch(this.#createInitialState());
  }

  // ----------------------------------------
  // Requests
  // ----------------------------------------

  #buildRequestConfigs(): Map<string, ResolvedRequestConfig<Target>> {
    const configs = new Map<string, ResolvedRequestConfig<Target>>();

    for (const slice of this.#slices) {
      for (const [name, config] of Object.entries(slice.request)) {
        configs.set(name, config as ResolvedRequestConfig<Target>);
      }
    }

    return configs;
  }

  #buildRequestProxy(): UnionSliceRequests<Slices> {
    const proxy: Record<string, (...args: any[]) => Promise<unknown>> = {};

    for (const [name, config] of this.#requestConfigs) {
      proxy[name] = (input?: unknown, meta?: RequestMetaInit) => {
        if (this.#destroyed) {
          return Promise.reject(new StoreError('DESTROYED'));
        }

        return this.#execute(name, config, input, meta ? createRequestMeta(meta) : null);
      };
    }

    return proxy as UnionSliceRequests<Slices>;
  }

  async #execute(
    name: string,
    config: ResolvedRequestConfig<Target>,
    input: unknown,
    meta: RequestMeta | null,
  ): Promise<unknown> {
    const key = resolveRequestKey(config.key, input);

    for (const cancelKey of resolveRequestCancelKeys(config.cancel, input)) {
      this.#queue.abort(cancelKey);
    }

    const handler = async ({ input, signal }: TaskContext) => {
      const target = this.#target;

      if (!target) {
        throw new StoreError('NO_TARGET');
      }

      for (const guard of config.guard) {
        if (signal.aborted) {
          throw new StoreError('ABORTED');
        }

        const result = await guard({ target, signal });

        if (!result) {
          throw new StoreError('REJECTED');
        }
      }

      return config.handler(input, { target, signal, meta });
    };

    try {
      return await this.#queue.enqueue({
        name,
        key,
        input,
        meta,
        schedule: config.schedule,
        handler,
      });
    } catch (error) {
      const tasks = this.#queue.tasks as Record<string | symbol, Task | undefined>;
      const task = tasks[key];

      this.#handleError({
        request: task?.status === 'pending' ? task : undefined,
        error,
      });

      throw error;
    }
  }

  // ----------------------------------------
  // Errors
  // ----------------------------------------

  #handleError(context: Omit<StoreErrorContext<Target, Slices>, 'store'>): void {
    if (this.#config.onError) {
      this.#config.onError({ ...context, store: this });
    } else {
      console.error('[vjs-store]', context.error);
    }
  }
}

// ----------------------------------------
// Factory
// ----------------------------------------

export function createStore<Slices extends AnySlice[]>(
  config: StoreConfig<UnionSliceTarget<Slices>, Slices>,
): Store<UnionSliceTarget<Slices>, Slices> {
  return new Store(config);
}

// ----------------------------------------
// Types
// ----------------------------------------

export type AnyStore<Target = any> = Store<Target, AnySlice<Target>[]>;

export type Selector<State, Selected> = (state: State) => Selected;

export interface SubscribeOptions<T> {
  equalityFn?: (a: T, b: T) => boolean;
}

export type AnyStoreConfig = StoreConfig<any, AnySlice[]>;

export interface StoreConfig<Target, Slices extends AnySlice<Target>[]> {
  slices: Slices;
  queue?: Queue<UnionSliceTasks<Slices>>;
  state?: StateFactory<UnionSliceState<Slices>>;
  onSetup?: (ctx: StoreSetupContext<Target, Slices>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, Slices>) => void;
  onError?: (ctx: StoreErrorContext<Target, Slices>) => void;
}

export interface StoreSetupContext<Target, Slices extends AnySlice<Target>[]> {
  store: Store<Target, Slices>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Target, Slices extends AnySlice<Target>[]> {
  store: Store<Target, Slices>;
  target: Target;
  signal: AbortSignal;
}

export interface StoreErrorContext<Target, Slices extends AnySlice<Target>[]> {
  request?: PendingTask | undefined;
  store: Store<Target, Slices>;
  error: unknown;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferStoreTarget<S extends AnyStore> = S extends Store<infer Target> ? Target : never;

export type InferStoreSlices<S extends AnyStore> = S extends Store<any, infer Slices> ? Slices : never;

export type InferStoreState<S extends AnyStore> = UnionSliceState<InferStoreSlices<S>>;

export type InferStoreRequests<S extends AnyStore> = UnionSliceRequests<InferStoreSlices<S>>;

export type InferStoreTasks<S extends AnyStore> = UnionSliceTasks<InferStoreSlices<S>>;
