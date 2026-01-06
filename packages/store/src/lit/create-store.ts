import type { Context } from '@lit/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../core/slice';
import type { StoreConfig } from '../core/store';
import type { StoreConnector, StoreProvider } from './mixins';

import { createContext } from '@lit/context';

import { Store } from '../core/store';
import { createStoreAttachMixin, createStoreMixin, createStoreProviderMixin } from './mixins';

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<UnionSliceTarget<Slices>, Slices> {}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  /**
   * Combined mixin: provides store via context AND auto-attaches slotted media.
   *
   * @example
   * ```ts
   * class MyPlayer extends StoreMixin(HTMLElement) {
   *   connectedCallback() {
   *     super.connectedCallback?.();
   *     this.attachShadow({ mode: 'open' });
   *     this.shadowRoot.innerHTML = '<slot></slot>';
   *   }
   * }
   * ```
   */
  StoreMixin: <T extends Constructor<CustomElement>>(
    Base: T,
  ) => T & Constructor<StoreProvider<Slices> & StoreConnector<Slices>>;

  /**
   * Mixin that provides store via context (no auto-attach).
   * Use when you need granular control over store provisioning.
   *
   * @example
   * ```ts
   * class MyProvider extends StoreProviderMixin(HTMLElement) {
   *   connectedCallback() {
   *     super.connectedCallback?.();
   *     // Store is available via context, but no auto-attach
   *   }
   * }
   * ```
   */
  StoreProviderMixin: <T extends Constructor<CustomElement>>(Base: T) => T & Constructor<StoreProvider<Slices>>;

  /**
   * Mixin that auto-attaches slotted media elements (requires store from context).
   * Use when inheriting store from a parent provider.
   *
   * @example
   * ```ts
   * class MyControls extends StoreAttachMixin(HTMLElement) {
   *   connectedCallback() {
   *     super.connectedCallback?.();
   *     // Will attach media from parent provider's context
   *   }
   * }
   * ```
   */
  StoreAttachMixin: <T extends Constructor<CustomElement>>(Base: T) => T & Constructor<StoreConnector<Slices>>;

  /**
   * Context for consuming store in controllers.
   * Use this with Lit's `ContextConsumer` or the `@consume` decorator.
   *
   * @example
   * ```ts
   * class MyElement extends LitElement {
   *   @consume({ context, subscribe: true })
   *   accessor store!: Store;
   * }
   * ```
   */
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>;

  /**
   * Creates a store instance for imperative access.
   * Useful for creating a store before rendering or for testing.
   *
   * @example
   * ```ts
   * const store = create();
   * store.attach(videoElement);
   * ```
   */
  create: () => Store<UnionSliceTarget<Slices>, Slices>;
}

/**
 * Creates a store factory that returns mixins, context, and a create function.
 *
 * @param config - Store configuration including slices and optional lifecycle hooks
 * @returns An object containing mixins, context, and create function
 *
 * @example
 * ```ts
 * import { createStore } from '@videojs/store/lit';
 * import { playbackSlice } from './slices/playback';
 *
 * const { StoreMixin, context, create } = createStore({
 *   slices: [playbackSlice],
 * });
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *     this.attachShadow({ mode: 'open' });
 *     this.shadowRoot.innerHTML = '<slot></slot>';
 *   }
 * }
 *
 * customElements.define('my-player', MyPlayer);
 * ```
 *
 * @example
 * ```html
 * <my-player>
 *   <video src="video.mp4"></video>
 * </my-player>
 * ```
 */
export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices> {
  type Target = UnionSliceTarget<Slices>;
  type StoreType = Store<Target, Slices>;

  const context = createContext<StoreType>(Symbol('@videojs/store'));

  function create(): StoreType {
    return new Store(config);
  }

  const StoreProviderMixin = createStoreProviderMixin<Slices>(
    context,
    create,
  ) as CreateStoreResult<Slices>['StoreProviderMixin'];

  const StoreAttachMixin = createStoreAttachMixin<Slices>(context) as CreateStoreResult<Slices>['StoreAttachMixin'];

  const StoreMixin = createStoreMixin<Slices>(context, create) as CreateStoreResult<Slices>['StoreMixin'];

  return {
    StoreMixin,
    StoreProviderMixin,
    StoreAttachMixin,
    context,
    create,
  };
}
