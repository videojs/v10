import type { Context } from '@lit/context';
import { ContextConsumer, createContext } from '@lit/context';
import type { ReactiveControllerHost, ReactiveElement } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import type { Constructor } from '@videojs/utils/types';
import type {
  AnyFeature,
  UnionFeatureRequests,
  UnionFeatureState,
  UnionFeatureTarget,
  UnionFeatureTasks,
} from '../core/feature';
import type { TasksRecord } from '../core/queue';
import type { StoreConfig, StoreConsumer, StoreProvider } from '../core/store';

import { Store } from '../core/store';
import { QueueController as QueueControllerBase } from './controllers';
import { createStoreAttachMixin, createStoreMixin, createStoreProviderMixin } from './mixins';

export const contextKey = Symbol('@videojs/store');

export interface CreateStoreConfig<Features extends AnyFeature[]>
  extends StoreConfig<UnionFeatureTarget<Features>, Features> {}

export type CreateStoreHost = ReactiveControllerHost & HTMLElement;

export interface StoreControllerValue<Features extends AnyFeature[]> {
  state: UnionFeatureState<Features>;
  request: UnionFeatureRequests<Features>;
}

export interface CreateStoreResult<Features extends AnyFeature[]> {
  /**
   * Combined mixin: provides store via context AND auto-attaches slotted media.
   *
   * @example
   * ```ts
   * class MyPlayer extends StoreMixin(LitElement) {}
   * ```
   */
  StoreMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<Features>>;

  /**
   * Mixin that provides store via context (no auto-attach).
   *
   * Use when you need granular control over store provisioning.
   *
   * @example
   * ```ts
   * class MyProvider extends StoreProviderMixin(LitElement) {}
   * ```
   */
  StoreProviderMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<Features>>;

  /**
   * Mixin that auto-attaches slotted media elements (requires store from context).
   *
   * Use when inheriting store from a parent provider.
   *
   * @example
   * ```ts
   * class MyControls extends StoreAttachMixin(LitElement) {}
   * ```
   */
  StoreAttachMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreConsumer<Features>>;

  /**
   * Context for consuming store in controllers.
   *
   * Use this with Lit's `ContextConsumer` or the `@consume` decorator.
   *
   * @example
   * ```ts
   * class MyElement extends LitElement {
   *   @consume({ context, subscribe: true })
   *   readonly store!: ContextType<typeof context>;
   * }
   * ```
   */
  context: Context<typeof contextKey, Store<UnionFeatureTarget<Features>, Features>>;

  /**
   * Creates a store instance for imperative access.
   *
   * Useful for creating a store before rendering or for testing.
   *
   * @example
   * ```ts
   * const store = create();
   * store.attach(videoElement);
   * ```
   */
  create: () => Store<UnionFeatureTarget<Features>, Features>;

  /**
   * Store controller bound to this store's context.
   * Subscribes to store state changes and provides access to state + request.
   *
   * @example
   * ```ts
   * const { StoreController } = createStore({ features: [playbackFeature] });
   *
   * class MyElement extends LitElement {
   *   #store = new StoreController(this);
   *
   *   render() {
   *     const { state, request } = this.#store.value;
   *     return html`
   *       <span>${state.volume}</span>
   *       <button @click=${() => request.setVolume(0.5)}>Set 50%</button>
   *     `;
   *   }
   * }
   * ```
   */
  StoreController: new (
    host: CreateStoreHost
  ) => {
    value: StoreControllerValue<Features>;
    hostConnected: () => void;
    hostDisconnected: () => void;
  };

  /**
   * Queue controller bound to this store's context.
   * Subscribes to queue task changes.
   *
   * @example
   * ```ts
   * const { QueueController } = createStore({ features: [playbackFeature] });
   *
   * class MyElement extends LitElement {
   *   #queue = new QueueController(this);
   *
   *   render() {
   *     const playTask = this.#queue.value.play;
   *     return html`<button ?disabled=${playTask?.status === 'pending'}>Play</button>`;
   *   }
   * }
   * ```
   */
  QueueController: new (
    host: CreateStoreHost
  ) => {
    value: Readonly<TasksRecord<UnionFeatureTasks<Features>>>;
    hostConnected: () => void;
    hostDisconnected: () => void;
  };
}

/**
 * Creates a store factory that returns mixins, context, bound controllers, and a create function.
 *
 * @param config - Store configuration including features and optional lifecycle hooks
 * @returns An object containing mixins, context, bound controllers, and create function
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { playbackFeature } from '@videojs/core/dom';
 *
 * const { StoreMixin, StoreController } = createStore({
 *   features: [playbackFeature],
 * });
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(LitElement) {}
 *
 * // Create a control element that uses the store via context
 * class MyControl extends LitElement {
 *   #store = new StoreController(this);
 *
 *   render() {
 *     const { state, request } = this.#store.value;
 *     return html`<span>${state.paused ? 'Paused' : 'Playing'}</span>`;
 *   }
 * }
 *
 * customElements.define('my-player', MyPlayer);
 * customElements.define('my-control', MyControl);
 * ```
 */
export function createStore<Features extends AnyFeature[]>(
  config: CreateStoreConfig<Features>
): CreateStoreResult<Features> {
  type Target = UnionFeatureTarget<Features>;
  type State = UnionFeatureState<Features>;
  type Requests = UnionFeatureRequests<Features>;
  type ProvidedStore = Store<Target, Features>;

  const context = createContext<ProvidedStore, typeof contextKey>(contextKey);

  function create(): ProvidedStore {
    return new Store(config);
  }

  const StoreProviderMixin = createStoreProviderMixin<Features>(context, create);
  const StoreAttachMixin = createStoreAttachMixin<Features>(context);
  const StoreMixin = createStoreMixin<Features>(context, create);

  class StoreController {
    readonly #host: CreateStoreHost;
    readonly #consumer: ContextConsumer<typeof context, CreateStoreHost>;
    #unsubscribe = noop;

    constructor(host: CreateStoreHost) {
      this.#host = host;
      this.#consumer = new ContextConsumer(host, {
        context,
        subscribe: true,
        callback: (store) => this.#connect(store),
      });
      host.addController(this);
    }

    get value(): StoreControllerValue<Features> {
      const store = this.#consumer.value;
      if (!store) {
        throw new Error('StoreController: Store not available from context');
      }
      return {
        state: store.state as State,
        request: store.request as Requests,
      };
    }

    hostConnected(): void {
      this.#consumer.hostConnected();
    }

    hostDisconnected(): void {
      this.#unsubscribe();
      this.#unsubscribe = noop;
    }

    #connect(store: ProvidedStore | undefined): void {
      this.#unsubscribe();
      if (!store) return;
      this.#unsubscribe = store.subscribe(() => this.#host.requestUpdate());
    }
  }

  class QueueController extends QueueControllerBase<ProvidedStore> {
    constructor(host: CreateStoreHost) {
      super(host, context);
    }
  }

  return {
    StoreMixin,
    StoreProviderMixin,
    StoreAttachMixin,
    context,
    create,
    StoreController,
    QueueController,
  };
}
