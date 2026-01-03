import type { ReactiveControllerHost } from '@lit/reactive-element';
import type { AnySlice, InferSliceState } from '../core/slice';
import type { AnyStore } from '../core/store';
import type { StoreContext } from './context';

import { ContextConsumer, ContextProvider } from '@lit/context';

import { PendingController } from './pending-controller';
import { SliceController } from './slice-controller';
import { StoreController } from './store-controller';

/**
 * Result of `createStoreControllers` factory.
 */
export interface StoreControllers<State extends object> {
  /** The context for this store. */
  context: StoreContext;

  /** Controller that provides the store to descendants via context. */
  Provider: new (host: ReactiveControllerHost & HTMLElement, store: AnyStore) => ContextProvider<StoreContext>;

  /** Controller that consumes the store from context. */
  Consumer: new (
    host: ReactiveControllerHost & HTMLElement
  ) => ContextConsumer<StoreContext, ReactiveControllerHost & HTMLElement>;

  /** Controller that subscribes to store state with optional selector. */
  StoreController: {
    new (host: ReactiveControllerHost, store: AnyStore): StoreController<State>;
    new<Selected>(
      host: ReactiveControllerHost,
      store: AnyStore,
      selector: (state: State) => Selected
    ): StoreController<State, Selected>;
  };

  /** Controller that subscribes to a specific slice's state. */
  SliceController: new <Slices extends AnySlice>(
    host: ReactiveControllerHost,
    store: AnyStore,
    slice: Slices
  ) => SliceController<State, InferSliceState<Slices>>;

  /** Controller that tracks pending requests. */
  PendingController: new (host: ReactiveControllerHost, store: AnyStore) => PendingController<any, any>;
}

/**
 * Create a set of typed store controllers bound to a specific context.
 *
 * @example
 * ```ts
 * import { createContext } from '@lit/context';
 *
 * const storeContext = createContext<MyStore>(Symbol('app-store'));
 * const { Provider, Consumer, StoreController } = createStoreControllers(storeContext);
 *
 * // Provider element
 * class AppProvider extends LitElement {
 *   private store = createStore({ slices: [...] });
 *   private provider = new Provider(this, this.store);
 * }
 *
 * // Consumer element
 * class AppConsumer extends LitElement {
 *   private consumer = new Consumer(this);
 *
 *   render() {
 *     const store = this.consumer.value;
 *     if (!store) return html`<span>No store</span>`;
 *     return html`<span>${store.state.count}</span>`;
 *   }
 * }
 * ```
 */
export function createStoreControllers<State extends object>(context: StoreContext): StoreControllers<State> {
  class BoundProvider extends ContextProvider<StoreContext> {
    constructor(host: ReactiveControllerHost & HTMLElement, store: AnyStore) {
      super(host, { context, initialValue: store });
    }
  }

  class BoundConsumer extends ContextConsumer<StoreContext, ReactiveControllerHost & HTMLElement> {
    constructor(host: ReactiveControllerHost & HTMLElement) {
      super(host, { context, subscribe: true });
    }
  }

  return {
    context,
    Provider: BoundProvider,
    Consumer: BoundConsumer,
    StoreController: StoreController as unknown as StoreControllers<State>['StoreController'],
    SliceController: SliceController as unknown as StoreControllers<State>['SliceController'],
    PendingController: PendingController as unknown as StoreControllers<State>['PendingController'],
  };
}
