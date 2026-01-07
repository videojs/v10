import type { Context } from '@lit/context';
import type { ReactiveControllerHost, ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';
import type { TasksRecord } from '../core/queue';
import type { AnySlice, UnionSliceRequests, UnionSliceState, UnionSliceTarget, UnionSliceTasks } from '../core/slice';
import type { StoreConfig, StoreConsumer, StoreProvider } from '../core/store';

import { createContext } from '@lit/context';

import { Store } from '../core/store';
import {
  RequestController as RequestControllerBase,
  SelectorController as SelectorControllerBase,
  TasksController as TasksControllerBase,
} from './controllers';
import { createStoreAttachMixin, createStoreMixin, createStoreProviderMixin } from './mixins';

export const contextKey = Symbol('@videojs/store');

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<UnionSliceTarget<Slices>, Slices> {}

export type CreateStoreHost = ReactiveControllerHost & HTMLElement;

export interface CreateStoreResult<Slices extends AnySlice[]> {
  /**
   * Combined mixin: provides store via context AND auto-attaches slotted media.
   *
   * @example
   * ```ts
   * class MyPlayer extends StoreMixin(LitElement) {}
   * ```
   */
  StoreMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<Slices>>;

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
  StoreProviderMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreProvider<Slices>>;

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
  StoreAttachMixin: <T extends Constructor<ReactiveElement>>(Base: T) => T & Constructor<StoreConsumer<Slices>>;

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
  context: Context<typeof contextKey, Store<UnionSliceTarget<Slices>, Slices>>;

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
  create: () => Store<UnionSliceTarget<Slices>, Slices>;

  /**
   * Selector controller bound to this store's context.
   * Subscribes to a selected portion of store state.
   *
   * @example
   * ```ts
   * const { SelectorController } = createStore({ slices: [playbackSlice] });
   *
   * class MyElement extends LitElement {
   *   #paused = new SelectorController(this, s => s.paused);
   *
   *   render() {
   *     return html`<button>${this.#paused.value ? 'Play' : 'Pause'}</button>`;
   *   }
   * }
   * ```
   */
  SelectorController: new <Value>(
    host: CreateStoreHost,
    selector: (state: UnionSliceState<Slices>) => Value
  ) => SelectorControllerBase<Store<UnionSliceTarget<Slices>, Slices>, Value>;

  /**
   * Request controller bound to this store's context.
   * Provides access to a store request by name.
   *
   * @example
   * ```ts
   * const { RequestController } = createStore({ slices: [playbackSlice] });
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
  RequestController: new <Name extends keyof UnionSliceRequests<Slices>>(
    host: CreateStoreHost,
    name: Name
  ) => RequestControllerBase<Store<UnionSliceTarget<Slices>, Slices>, Name>;

  /**
   * Tasks controller bound to this store's context.
   * Subscribes to task state changes.
   *
   * @example
   * ```ts
   * const { TasksController } = createStore({ slices: [playbackSlice] });
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
    value: TasksRecord<UnionSliceTasks<Slices>>;
    hostConnected: () => void;
    hostDisconnected: () => void;
  };
}

/**
 * Creates a store factory that returns mixins, context, bound controllers, and a create function.
 *
 * @param config - Store configuration including slices and optional lifecycle hooks
 * @returns An object containing mixins, context, bound controllers, and create function
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { playbackSlice } from '@videojs/core/dom';
 *
 * const { StoreMixin, SelectorController } = createStore({
 *   slices: [playbackSlice],
 * });
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(LitElement) {}
 *
 * // Create a control element that uses the store via context
 * class MyControl extends LitElement {
 *   #paused = new SelectorController(this, s => s.paused);
 *
 *   render() {
 *     return html`<span>${this.#paused.value ? 'Paused' : 'Playing'}</span>`;
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
export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices> {
  type Target = UnionSliceTarget<Slices>;
  type State = UnionSliceState<Slices>;
  type Requests = UnionSliceRequests<Slices>;
  type ProvidedStore = Store<Target, Slices>;

  const context = createContext<ProvidedStore, typeof contextKey>(contextKey);

  function create(): ProvidedStore {
    return new Store(config);
  }

  const StoreProviderMixin = createStoreProviderMixin<Slices>(context, create);
  const StoreAttachMixin = createStoreAttachMixin<Slices>(context);
  const StoreMixin = createStoreMixin<Slices>(context, create);

  class SelectorController<Value> extends SelectorControllerBase<ProvidedStore, Value> {
    constructor(host: CreateStoreHost, selector: (state: State) => Value) {
      super(host, context, selector);
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
    SelectorController,
    RequestController,
    TasksController,
  };
}
