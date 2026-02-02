import type { Context } from '@lit/context';
import { ContextConsumer, createContext } from '@lit/context';
import type { ReactiveControllerHost, ReactiveElement } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import type { Constructor } from '@videojs/utils/types';
import type { StoreCallbacks } from '../core/config';
import type { InferSliceState, InferSliceTarget, Slice } from '../core/slice';
import type { AnyStore, InferStoreState, Store } from '../core/store';
import { createStore as createCoreStore } from '../core/store';
import { createContainerMixin, createProviderMixin, createStoreMixin } from './mixins';
import type { StoreConsumer, StoreProvider } from './types';

export const contextKey = Symbol('@videojs/store');

export interface CreateStoreOptions<Target, State> extends StoreCallbacks<Target, State> {}

export type CreateStoreHost = ReactiveControllerHost & HTMLElement;

export type StoreControllerValue<S extends AnyStore> = InferStoreState<S>;

export interface CreateStoreResult<S extends AnyStore> {
  /**
   * Combined mixin: provides store via context AND auto-attaches slotted media.
   *
   * @example
   * ```ts
   * class MyPlayer extends StoreMixin(LitElement) {}
   * ```
   */
  StoreMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<S>>;

  /**
   * Mixin that provides store via context (no auto-attach).
   *
   * Use when you need granular control over store provisioning.
   *
   * @example
   * ```ts
   * class MyProvider extends ProviderMixin(LitElement) {}
   * ```
   */
  ProviderMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<S>>;

  /**
   * Mixin that auto-attaches slotted media elements (requires store from context).
   *
   * Use when inheriting store from a parent provider.
   *
   * @example
   * ```ts
   * class MyControls extends ContainerMixin(LitElement) {}
   * ```
   */
  ContainerMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreConsumer<S>>;

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
  context: Context<typeof contextKey, S>;

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
  create: () => S;

  /**
   * Store controller bound to this store's context.
   * Subscribes to store state changes and provides access to state and request functions.
   *
   * @example
   * ```ts
   * const { StoreController } = createStore(playbackSlice);
   *
   * class MyElement extends LitElement {
   *   #store = new StoreController(this);
   *
   *   render() {
   *     const { volume, setVolume } = this.#store.value;
   *     return html`
   *       <span>${volume}</span>
   *       <button @click=${() => setVolume(0.5)}>Set 50%</button>
   *     `;
   *   }
   * }
   * ```
   */
  StoreController: new (
    host: CreateStoreHost
  ) => {
    value: StoreControllerValue<S>;
    hostConnected: () => void;
    hostDisconnected: () => void;
  };
}

/**
 * Creates a store factory that returns mixins, context, bound controllers, and a create function.
 *
 * @param slice - Slice defining state and attach behavior
 * @param options - Optional store lifecycle hooks
 * @returns An object containing mixins, context, bound controllers, and create function
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { combine, defineSlice } from '@videojs/store';
 *
 * const playbackSlice = defineSlice<HTMLMediaElement>()({
 *   state: () => ({ paused: true }),
 *   attach: ({ target, set, signal }) => {
 *     target.addEventListener('play', () => set({ paused: false }), { signal });
 *     target.addEventListener('pause', () => set({ paused: true }), { signal });
 *   },
 * });
 *
 * const { StoreMixin, StoreController } = createStore(playbackSlice);
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(LitElement) {}
 *
 * // Create a control element that uses the store via context
 * class MyControl extends LitElement {
 *   #store = new StoreController(this);
 *
 *   render() {
 *     const { paused } = this.#store.value;
 *     return html`<span>${paused ? 'Paused' : 'Playing'}</span>`;
 *   }
 * }
 *
 * customElements.define('my-player', MyPlayer);
 * customElements.define('my-control', MyControl);
 * ```
 */
export function createStore<S extends Slice<any, any>>(
  slice: S,
  options?: CreateStoreOptions<InferSliceTarget<S>, InferSliceState<S>>
): CreateStoreResult<Store<InferSliceTarget<S>, InferSliceState<S>>> {
  type Target = InferSliceTarget<S>;
  type ProvidedStore = Store<Target, InferSliceState<S>>;

  const context = createContext<ProvidedStore, typeof contextKey>(contextKey);

  function create(): ProvidedStore {
    return createCoreStore<Target>()(slice, options);
  }

  const ProviderMixin = createProviderMixin<ProvidedStore>(context, create);
  const ContainerMixin = createContainerMixin<ProvidedStore>(context);
  const StoreMixin = createStoreMixin<ProvidedStore>(context, create);

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

    get value(): StoreControllerValue<ProvidedStore> {
      const store = this.#consumer.value;

      if (!store) {
        throw new Error('Store not available');
      }

      // State and actions are directly on the store object
      return store as unknown as StoreControllerValue<ProvidedStore>;
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

  return {
    StoreMixin,
    ProviderMixin,
    ContainerMixin,
    context,
    create,
    StoreController,
  };
}
