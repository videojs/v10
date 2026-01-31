import { abortable } from '@videojs/utils/events';
import { isNull } from '@videojs/utils/predicate';
import { StoreError } from './errors';
import type { AnyFeature, FeatureUpdate, UnionFeatureRequests, UnionFeatureState, UnionFeatureTarget } from './feature';

import { Queue } from './queue';
import type { RequestMeta, RequestMetaInit, ResolvedRequestConfig } from './request';
import { CANCEL_ALL, createRequestMeta, resolveRequestCancel, resolveRequestKey } from './request';
import type { StateChange, WritableState } from './state';
import { createState } from './state';

export class Store<Target, Features extends AnyFeature<Target>[] = AnyFeature<Target>[]> {
  readonly #config: StoreConfig<Target, Features>;
  readonly #features: Features;
  readonly #queue: Queue;
  readonly #request: UnionFeatureRequests<Features>;
  readonly #requestConfigs: Map<string, ResolvedRequestConfig<Target>>;
  readonly #setupAbort = new AbortController();
  readonly #state: WritableState<UnionFeatureState<Features> & object>;

  #target: Target | null = null;
  #attachAbort: AbortController | null = null;
  #destroyed = false;

  constructor(config: StoreConfig<Target, Features>) {
    this.#config = config;
    this.#features = config.features;

    this.#queue = new Queue();
    this.#state = createState(this.#createInitialState() as UnionFeatureState<Features> & object);

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

  /** Current state snapshot. */
  get state(): Readonly<UnionFeatureState<Features> & object> {
    return this.#state.current;
  }

  get request(): UnionFeatureRequests<Features> {
    return this.#request;
  }

  get features(): Features {
    return this.#features;
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

    for (const feature of this.#features) {
      try {
        const update = this.#createUpdate(feature);
        feature.subscribe({ target: newTarget, update, signal });
      } catch (error) {
        this.#handleError({ error });
      }
    }

    this.#syncAllFeatures();

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

  #createUpdate(feature: AnyFeature<Target>): FeatureUpdate {
    return () => {
      const target = this.#target;
      if (target) this.#syncFeature(feature, target);
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

  /** Subscribe to state changes. */
  subscribe(callback: StateChange): () => void;

  subscribe<K extends keyof UnionFeatureState<Features>>(keys: K[], callback: StateChange): () => void;

  subscribe(first: StateChange | (keyof UnionFeatureState<Features>)[], second?: StateChange): () => void {
    return this.#state.subscribe(first as (keyof UnionFeatureState<Features>)[], second as StateChange);
  }

  #syncAllFeatures(): void {
    const target = this.#target;
    if (!target) return;

    for (const feature of this.#features) {
      this.#syncFeature(feature, target);
    }
  }

  #syncFeature(feature: AnyFeature<Target>, target: Target): void {
    try {
      const snapshot = feature.getSnapshot({
        target,
        initialState: feature.initialState,
      });

      this.#state.patch(snapshot);
    } catch (error) {
      this.#handleError({ error });
    }
  }

  #createInitialState(): UnionFeatureState<Features> {
    const initialState: Record<string, unknown> = {};

    for (const feature of this.#features) {
      Object.assign(initialState, feature.initialState);
    }

    return initialState as UnionFeatureState<Features>;
  }

  #resetState(): void {
    this.#state.patch(this.#createInitialState() as Partial<UnionFeatureState<Features> & object>);
  }

  // ----------------------------------------
  // Requests
  // ----------------------------------------

  #buildRequestConfigs(): Map<string, ResolvedRequestConfig<Target>> {
    const configs = new Map<string, ResolvedRequestConfig<Target>>();

    for (const feature of this.#features) {
      for (const [name, config] of Object.entries(feature.request)) {
        configs.set(name, config as ResolvedRequestConfig<Target>);
      }
    }

    return configs;
  }

  #buildRequestProxy(): UnionFeatureRequests<Features> {
    const reqProxy: Record<string, (...args: any[]) => Promise<unknown>> = {};

    for (const [name, config] of this.#requestConfigs) {
      reqProxy[name] = (input?: unknown, meta?: RequestMetaInit) => {
        if (this.#destroyed) {
          return Promise.reject(new StoreError('DESTROYED'));
        }

        return this.#execute(name, config, input, meta ? createRequestMeta(meta) : null);
      };
    }

    return reqProxy as UnionFeatureRequests<Features>;
  }

  async #execute(
    _name: string,
    config: ResolvedRequestConfig<Target>,
    input: unknown,
    meta: RequestMeta | null
  ): Promise<unknown> {
    const key = resolveRequestKey(config.key, input);

    const cancel = resolveRequestCancel(config.cancel, input);
    if (cancel === CANCEL_ALL) {
      this.#queue.abort();
    } else {
      for (const requestName of cancel) {
        this.#queue.abort(requestName);
      }
    }

    const handler = async ({ signal }: { signal: AbortSignal }) => {
      const target = this.#target;

      if (!target) {
        throw new StoreError('NO_TARGET');
      }

      for (const guard of config.guard) {
        const result = await abortable(Promise.resolve(guard({ target, signal })), signal);

        if (!result) {
          throw new StoreError('REJECTED');
        }
      }

      return config.handler(input, { target, signal, meta });
    };

    try {
      return await this.#queue.enqueue({
        key,
        mode: config.mode,
        handler,
      });
    } catch (error) {
      this.#handleError({ error });
      throw error;
    }
  }

  // ----------------------------------------
  // Errors
  // ----------------------------------------

  #handleError(context: Omit<StoreErrorContext<Target, Features>, 'store'>): void {
    if (this.#config.onError) {
      this.#config.onError({ ...context, store: this });
    } else {
      console.error('[vjs-store]', context.error);
    }
  }
}

export function isStore(value: unknown): value is AnyStore {
  return value instanceof Store;
}

// ----------------------------------------
// Factory
// ----------------------------------------

export function createStore<Features extends AnyFeature[]>(
  config: StoreConfig<UnionFeatureTarget<Features>, Features>
): Store<UnionFeatureTarget<Features>, Features> {
  return new Store(config);
}

// ----------------------------------------
// Types
// ----------------------------------------

export type AnyStore<Target = any> = Store<Target, AnyFeature<Target>[]>;

export type AnyStoreConfig = StoreConfig<any, AnyFeature[]>;

export interface StoreConfig<Target, Features extends AnyFeature<Target>[]> {
  features: Features;
  onSetup?: (ctx: StoreSetupContext<Target, Features>) => void;
  onAttach?: (ctx: StoreAttachContext<Target, Features>) => void;
  onError?: (ctx: StoreErrorContext<Target, Features>) => void;
}

export interface StoreSetupContext<Target, Features extends AnyFeature<Target>[]> {
  store: Store<Target, Features>;
  signal: AbortSignal;
}

export interface StoreAttachContext<Target, Features extends AnyFeature<Target>[]> {
  store: Store<Target, Features>;
  target: Target;
  signal: AbortSignal;
}

export interface StoreErrorContext<Target, Features extends AnyFeature<Target>[]> {
  store: Store<Target, Features>;
  error: unknown;
}

export interface StoreProvider<Features extends AnyFeature[]> {
  store: Store<UnionFeatureTarget<Features>, Features>;
}

export interface StoreConsumer<Features extends AnyFeature[]> {
  readonly store: Store<UnionFeatureTarget<Features>, Features> | null;
}

// ----------------------------------------
// Type Inference
// ----------------------------------------

export type InferStoreTarget<S extends AnyStore> = S extends Store<infer Target> ? Target : never;

export type InferStoreFeatures<S extends AnyStore> = S extends Store<any, infer Features> ? Features : never;

export type InferStoreState<S extends AnyStore> = UnionFeatureState<InferStoreFeatures<S>>;

export type InferStoreRequests<S extends AnyStore> = UnionFeatureRequests<InferStoreFeatures<S>>;
