import type { Context } from '@lit/context';
import type { ReactiveControllerHost, ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';
import type { AnyFeature, UnionFeatureRequests, UnionFeatureState, UnionFeatureTarget, UnionFeatureTasks } from '../core/feature';
import type { TasksRecord } from '../core/queue';
import type { StoreConfig, StoreConsumer, StoreProvider } from '../core/store';

import { ContextConsumer, createContext } from '@lit/context';
import { noop } from '@videojs/utils/function';

import { subscribe } from '../core/state';
import { Store } from '../core/store';
import { RequestController as RequestControllerBase, TasksController as TasksControllerBase } from './controllers';
import { createStoreAttachMixin, createStoreMixin, createStoreProviderMixin } from './mixins';

export const contextKey = Symbol('@videojs/store');

export interface CreateStoreConfig<Features extends AnyFeature[]> extends StoreConfig<UnionFeatureTarget<Features>, Features> {}

export type CreateStoreHost = ReactiveControllerHost & HTMLElement;

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
   * State controller bound to this store's context.
   * Subscribes to store state changes and triggers host updates.
   *
   * @example
   * ```ts
   * const { StateController } = createStore({ features: [playbackFeature] });
   *
   * class MyElement extends LitElement {
   *   #state = new StateController(this);
   *
   *   render() {
   *     return html`<button>${this.#state.value.paused ? 'Play' : 'Pause'}</button>`;
   *   }
   * }
   * ```
   */
  StateController: new (host: CreateStoreHost) => {
    value: UnionFeatureState<Features>;
    hostConnected: () => void;
    hostDisconnected: () => void;
  };

  /**
   * Request controller bound to this store's context.
   * Provides access to a store request by name.
   *
   * @example
   * ```ts
   * const { RequestController } = createStore({ features: [playbackFeature] });
   *
   * class MyElement extends LitElement {
   *   #play = new RequestController(this, 'play');
   *
   *   render() {
   *     return html`<button @click=${() => this.#play.value()}>Play</button>`;
   *   }
   * }
   * ```
   */
  RequestController: new <Name extends keyof UnionFeatureRequests<Features>>(
    host: CreateStoreHost,
    name: Name
  ) => RequestControllerBase<Store<UnionFeatureTarget<Features>, Features>, Name>;

  /**
   * Tasks controller bound to this store's context.
   * Subscribes to task state changes.
   *
   * @example
   * ```ts
   * const { TasksController } = createStore({ features: [playbackFeature] });
   *
   * class MyElement extends LitElement {
   *   #tasks = new TasksController(this);
   *
   *   render() {
   *     const playTask = this.#tasks.value.play;
   *     return html`<button ?disabled=${playTask?.status === 'pending'}>Play</button>`;
   *   }
   * }
   * ```
   */
  TasksController: new (host: CreateStoreHost) => {
    value: TasksRecord<UnionFeatureTasks<Features>>;
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
 * const { StoreMixin, StateController } = createStore({
 *   features: [playbackFeature],
 * });
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(LitElement) {}
 *
 * // Create a control element that uses the store via context
 * class MyControl extends LitElement {
 *   #state = new StateController(this);
 *
 *   render() {
 *     return html`<span>${this.#state.value.paused ? 'Paused' : 'Playing'}</span>`;
 *   }
 * }
 *
 * customElements.define('my-player', MyPlayer);
 * customElements.define('my-control', MyControl);
 * ```
 *
 * @example
 * ```html
 * <my-player>
 *   <video src="video.mp4"></video>
 *   <my-control></my-control>
 * </my-player>
 * ```
 */
export function createStore<Features extends AnyFeature[]>(config: CreateStoreConfig<Features>): CreateStoreResult<Features> {
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

  class StateController {
    readonly #host: CreateStoreHost;
    readonly #consumer: ContextConsumer<typeof context, CreateStoreHost>;
    #unsubscribe = noop;

    constructor(host: CreateStoreHost) {
      this.#host = host;
      this.#consumer = new ContextConsumer(host, {
        context,
        subscribe: true,
        callback: store => this.#connect(store),
      });
      host.addController(this);
    }

    get value(): State {
      const store = this.#consumer.value;
      if (!store) {
        throw new Error('StateController: Store not available from context');
      }
      return store.state;
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
      this.#unsubscribe = subscribe(store.state, () => this.#host.requestUpdate());
    }
  }

  class RequestController<Name extends keyof Requests> extends RequestControllerBase<ProvidedStore, Name> {
    constructor(host: CreateStoreHost, name: Name) {
      super(host, context, name);
    }
  }

  class TasksController extends TasksControllerBase<ProvidedStore> {
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
    StateController,
    RequestController,
    TasksController,
  };
}
