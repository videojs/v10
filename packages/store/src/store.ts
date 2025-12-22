import type { RequestMeta } from './meta';
import type { Queue, TaskTypes } from './queue';
import type { InferSliceRequests, InferSliceState, InferSliceTaskTypes, ResolvedRequestConfig, Slice } from './slice';
import type { StateFactory } from './state';
import { NoTargetError, RequestCancelledError, StoreError } from './errors';
import { createRequestMeta, isRequestMeta } from './meta';
import { resolveRequestCancelKeys, resolveRequestKey } from './slice';
import { State } from './state';

// ----------------------------------------
// Types
// ----------------------------------------

export interface StoreConfig<
  Target,
  Slices extends Slice<Target, any, any>[],
  Tasks extends TaskTypes = InferStoreTasks<Slices>,
> {
  slices: Slices;
  queue: Queue<Tasks>;
  state?: StateFactory<InferStoreState<Slices>>;
  onSetup?: (ctx: StoreSetupContext<Target, Slices, Tasks>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, Slices, Tasks>) => void;
  onError?: (ctx: StoreErrorContext<Target, Slices, Tasks>) => void;
}

export interface StoreSetupContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskTypes> {
  store: Store<Target, Slices, Tasks>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskTypes> {
  store: Store<Target, Slices, Tasks>;
  target: Target;
  signal: AbortSignal;
}

export interface StoreErrorContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskTypes> {
  error: unknown;
  store: Store<Target, Slices, Tasks>;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;

export type InferStoreState<Slices extends Slice<any, any, any>[]> = UnionToIntersection<
  InferSliceState<Slices[number]>
>;

export type InferStoreRequests<Slices extends Slice<any, any, any>[]> = UnionToIntersection<
  InferSliceRequests<Slices[number]>
>;

export type InferStoreTasks<Slices extends Slice<any, any, any>[]> = UnionToIntersection<
  InferSliceTaskTypes<Slices[number]>
> & TaskTypes;

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Store<
  Target,
  Slices extends Slice<Target, any, any>[] = Slice<Target, any, any>[],
  Tasks extends TaskTypes = InferStoreTasks<Slices>,
> {
  readonly #config: StoreConfig<Target, Slices, Tasks>;
  readonly #slices: Slices;
  readonly #queue: Queue<Tasks>;
  readonly #state: State<InferStoreState<Slices>>;
  readonly #request: InferStoreRequests<Slices>;
  readonly #requestConfigs: Map<string, ResolvedRequestConfig<Target>>;
  readonly #setupAbort = new AbortController();

  #target: Target | null = null;
  #attachAbort: AbortController | null = null;
  #destroyed = false;

  constructor(config: StoreConfig<Target, Slices, Tasks>) {
    this.#config = config;
    this.#slices = config.slices;
    this.#queue = config.queue;

    // Merge initial state

    // Use provided factory or default
    const factory = config.state ?? (initial => new State(initial));
    this.#state = factory(this.#createInitialState());

    this.#requestConfigs = this.#buildRequestConfigs();
    this.#request = this.#buildRequestProxy();

    try {
      config.onSetup?.({ store: this, signal: this.#setupAbort.signal });
    } catch (error) {
      this.#handleError(error);
    }
  }

  // ----------------------------------------
  // Public Getters
  // ----------------------------------------

  get target(): Target | null {
    return this.#target;
  }

  get state(): InferStoreState<Slices> {
    return this.#state.value;
  }

  get request(): InferStoreRequests<Slices> {
    return this.#request;
  }

  get queue(): Queue<Tasks> {
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
      throw new StoreError('Destroyed');
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
        this.#handleError(error);
      }
    }

    this.#syncAllSlices();

    try {
      this.#config.onAttach?.({ store: this, target: newTarget, signal });
    } catch (error) {
      this.#handleError(error);
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
          this.#state.patch(partial as Partial<InferStoreState<Slices>>);
        }
      } catch (error) {
        this.#handleError(error);
      }
    };
  }

  #detach(): void {
    this.#attachAbort?.abort();
    this.#attachAbort = null;
    this.#target = null;
    this.#queue.abortAll('Target detached');
    this.#resetState();
  }

  // ----------------------------------------
  // Subscribe
  // ----------------------------------------

  subscribe(listener: (state: InferStoreState<Slices>) => void): () => void;
  subscribe<K extends keyof InferStoreState<Slices>>(
    keys: K[],
    listener: (state: Pick<InferStoreState<Slices>, K>) => void,
  ): () => void;
  subscribe<K extends keyof InferStoreState<Slices>>(
    keysOrListener: ((state: InferStoreState<Slices>) => void) | K[],
    maybeListener?: (state: Pick<InferStoreState<Slices>, K>) => void,
  ): () => void {
    if (Array.isArray(keysOrListener)) {
      return this.#state.subscribeKeys(keysOrListener, maybeListener!);
    }

    return this.#state.subscribe(keysOrListener);
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

  #syncSlice(slice: Slice<Target, any, any>, target: Target): void {
    try {
      const snapshot = slice.getSnapshot({
        target,
        initialState: slice.initialState,
      });

      this.#state.patch(snapshot);
    } catch (error) {
      this.#handleError(error);
    }
  }

  #createInitialState(): InferStoreState<Slices> {
    const initialState: Record<string, unknown> = {};

    for (const slice of this.#slices) {
      Object.assign(initialState, slice.initialState);
    }

    return initialState as InferStoreState<Slices>;
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
      for (const [name, config] of Object.entries(slice.requests)) {
        configs.set(name, config as ResolvedRequestConfig<Target>);
      }
    }

    return configs;
  }

  #buildRequestProxy(): InferStoreRequests<Slices> {
    const proxy: Record<string, (...args: any[]) => Promise<unknown>> = {};

    for (const [name, config] of this.#requestConfigs) {
      proxy[name] = (inputOrMeta?: unknown, maybeMeta?: Omit<RequestMeta, symbol>) => {
        if (this.#destroyed) {
          return Promise.reject(new StoreError('Store has been destroyed'));
        }

        const { input, meta } = this.#parseArgs(inputOrMeta, maybeMeta);

        return this.#execute(name, config, input, meta);
      };
    }

    return proxy as InferStoreRequests<Slices>;
  }

  #parseArgs(
    inputOrMeta: unknown,
    maybeMeta: Omit<RequestMeta, symbol> | undefined,
  ): { input: unknown; meta: RequestMeta } {
    if (maybeMeta !== undefined) {
      return {
        input: inputOrMeta,
        meta: createRequestMeta(maybeMeta),
      };
    }

    if (isRequestMeta(inputOrMeta)) {
      return {
        input: undefined,
        meta: createRequestMeta(inputOrMeta as Omit<RequestMeta, symbol>),
      };
    }

    return {
      input: inputOrMeta,
      meta: createRequestMeta({
        source: 'unknown',
        context: undefined,
      }),
    };
  }

  async #execute(
    name: string,
    config: ResolvedRequestConfig<Target>,
    input: unknown,
    meta: RequestMeta,
  ): Promise<unknown> {
    const key = resolveRequestKey(config.key, input);

    for (const cancelKey of resolveRequestCancelKeys(config.cancel, input)) {
      this.#queue.abort(cancelKey, `Cancelled by ${name}`);
    }

    const handler = async ({ signal }: { signal: AbortSignal }) => {
      const target = this.#target;

      if (!target) {
        throw new NoTargetError();
      }

      for (const guard of config.guard) {
        if (signal.aborted) {
          throw new RequestCancelledError('Aborted');
        }

        const result = await guard({ target, signal });

        if (!result) {
          throw new RequestCancelledError('Guard rejected');
        }
      }

      return config.handler(input, { target, signal, meta });
    };

    return this.#queue.enqueue({
      name,
      key,
      input,
      schedule: config.schedule,
      handler,
    });
  }

  // ----------------------------------------
  // Errors
  // ----------------------------------------

  #handleError(error: unknown): void {
    if (this.#config.onError) {
      try {
        this.#config.onError({ error, store: this });
      } catch {
        console.error('[Store Error]', error);
      }
    } else {
      console.error('[Store Error]', error);
    }
  }
}

// ----------------------------------------
// Factory
// ----------------------------------------

export function createStore<Target, Slices extends Slice<Target, any, any>[]>(
  config: StoreConfig<Target, Slices, InferStoreTasks<Slices>>,
): Store<Target, Slices, InferStoreTasks<Slices>> {
  return new Store(config);
}
