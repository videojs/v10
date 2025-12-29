import type { EnsureTaskRecord, PendingTask, TaskContext, TaskRecord } from './queue';
import type { RequestMeta, RequestMetaInit, ResolvedRequestConfig } from './request';
import type { InferSliceRequests, InferSliceState, InferSliceTarget, ResolveSliceRequestHandlers, Slice } from './slice';
import type { StateFactory } from './state';
import { isNull } from '@videojs/utils';
import { StoreError } from './errors';
import { Queue } from './queue';
import { createRequestMeta, resolveRequestCancelKeys, resolveRequestKey } from './request';
import { State } from './state';

export class Store<
  Target,
  Slices extends Slice<Target, any, any>[] = Slice<Target, any, any>[],
  Tasks extends TaskRecord = InferStoreTasks<Slices>,
> {
  readonly #config: StoreConfig<Target, Slices, Tasks>;
  readonly #slices: Slices;
  readonly #queue: Queue<Tasks>;
  readonly #state: State<InferStoreState<Slices>>;
  readonly #request: InferStoreRequest<Slices>;
  readonly #requestConfigs: Map<string, ResolvedRequestConfig<Target>>;
  readonly #setupAbort = new AbortController();

  #target: Target | null = null;
  #attachAbort: AbortController | null = null;
  #destroyed = false;

  constructor(config: StoreConfig<Target, Slices, Tasks>) {
    this.#config = config;
    this.#slices = config.slices;

    this.#queue = config.queue ?? new Queue<Tasks>();

    // Use provided factory or default
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

  get state(): InferStoreState<Slices> {
    return this.#state.value;
  }

  get request(): InferStoreRequest<Slices> {
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
      throw new StoreError('Store destroyed');
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
          this.#state.patch(partial as Partial<InferStoreState<Slices>>);
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
      this.#handleError({ error });
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
      for (const [name, config] of Object.entries(slice.request)) {
        configs.set(name, config as ResolvedRequestConfig<Target>);
      }
    }

    return configs;
  }

  #buildRequestProxy(): InferStoreRequest<Slices> {
    const proxy: Record<string, (...args: any[]) => Promise<unknown>> = {};

    for (const [name, config] of this.#requestConfigs) {
      proxy[name] = (input?: unknown, meta?: RequestMetaInit) => {
        if (this.#destroyed) {
          return Promise.reject(new StoreError('Store destroyed'));
        }

        return this.#execute(
          name,
          config,
          input,
          meta ? createRequestMeta(meta) : null,
        );
      };
    }

    return proxy as InferStoreRequest<Slices>;
  }

  async #execute(
    name: string,
    config: ResolvedRequestConfig<Target>,
    input: unknown,
    meta: RequestMeta | null,
  ): Promise<unknown> {
    const key = resolveRequestKey(config.key, input);

    for (const cancelKey of resolveRequestCancelKeys(config.cancel, input)) {
      this.#queue.abort(cancelKey, `Cancelled by ${name}`);
    }

    const handler = async ({ input, signal }: TaskContext) => {
      const target = this.#target;

      if (!target) {
        throw new StoreError('No target attached');
      }

      for (const guard of config.guard) {
        if (signal.aborted) {
          throw new StoreError('Aborted');
        }

        const result = await guard({ target, signal });

        if (!result) {
          throw new StoreError('Rejected');
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
      this.#handleError({
        request: this.#queue.pending.get(key),
        error,
      });

      throw error;
    }
  }

  // ----------------------------------------
  // Errors
  // ----------------------------------------

  #handleError(context: Omit<StoreErrorContext<Target, Slices, Tasks>, 'store'>): void {
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

export function createStore<Slices extends Slice<any, any, any>[]>(
  config: StoreConfig<InferSliceTarget<Slices[number]>, Slices, InferStoreTasks<Slices>>,
): Store<InferSliceTarget<Slices[number]>, Slices, InferStoreTasks<Slices>> {
  return new Store(config);
}

// ----------------------------------------
// Types
// ----------------------------------------

export interface StoreConfig<
  Target,
  Slices extends Slice<Target, any, any>[],
  Tasks extends TaskRecord = InferStoreTasks<Slices>,
> {
  slices: Slices;
  queue?: Queue<Tasks>;
  state?: StateFactory<InferStoreState<Slices>>;
  onSetup?: (ctx: StoreSetupContext<Target, Slices, Tasks>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, Slices, Tasks>) => void;
  onError?: (ctx: StoreErrorContext<Target, Slices, Tasks>) => void;
}

export interface StoreSetupContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskRecord> {
  store: Store<Target, Slices, Tasks>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskRecord> {
  store: Store<Target, Slices, Tasks>;
  target: Target;
  signal: AbortSignal;
}

export interface StoreErrorContext<Target, Slices extends Slice<Target, any, any>[], Tasks extends TaskRecord> {
  request?: PendingTask | undefined;
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

export type InferStoreRequest<Slices extends Slice<any, any, any>[]>
  = UnionToIntersection<ResolveSliceRequestHandlers<Slices[number]>>;

export type InferStoreTasks<Slices extends Slice<any, any, any>[]>
  = EnsureTaskRecord<UnionToIntersection<InferSliceRequests<Slices[number]>>>;
