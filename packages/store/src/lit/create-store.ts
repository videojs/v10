import type { Context } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../core/slice';

import type { StoreConfig, StoreConsumer, StoreProvider } from '../core/store';

import { createContext } from '@lit/context';
import { Store } from '../core/store';
import { createStoreAttachMixin, createStoreMixin, createStoreProviderMixin } from './mixins';

export const contextKey = Symbol('@videojs/store');

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<UnionSliceTarget<Slices>, Slices> {}

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
 * import { playbackSlice } from '@videojs/core/dom';
 *
 * const { StoreMixin } = createStore({
 *   slices: [playbackSlice],
 * });
 *
 * // Create a player element with store
 * class MyPlayer extends StoreMixin(LitElement) {}
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
  type ProvidedStore = Store<Target, Slices>;

  const context = createContext<ProvidedStore, typeof contextKey>(contextKey);

  function create(): ProvidedStore {
    return new Store(config);
  }

  const StoreProviderMixin = createStoreProviderMixin<Slices>(
    context,
    create,
  );

  const StoreAttachMixin = createStoreAttachMixin<Slices>(context);

  const StoreMixin = createStoreMixin<Slices>(context, create);

  return {
    StoreMixin,
    StoreProviderMixin,
    StoreAttachMixin,
    context,
    create,
  };
}
