import type { Context } from '@lit/context';
import { ContextConsumer } from '@lit/context';
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore } from '../../core/store';
import { isStore } from '../../core/store';
import type { StoreSource } from '../store-accessor';

export type SubscriptionControllerHost = ReactiveControllerHost & HTMLElement;

export interface SubscriptionControllerConfig<Store extends AnyStore, Value> {
  /** Subscribe to the store. Returns an unsubscribe function. */
  subscribe: (store: Store, onChange: () => void) => () => void;
  /** Get the current value from the store. */
  getValue: (store: Store) => Value;
}

/**
 * Resolves a store from context or direct source and manages subscription lifecycle.
 *
 * Combines store resolution (direct or context) with subscription management.
 * Use as a building block for controllers that need store access with subscriptions.
 *
 * @example
 * ```ts
 * class MyController<Store extends AnyStore> {
 *   #ctrl: SubscriptionController<Store, Store['queue']['tasks']>;
 *
 *   constructor(host: Host, source: StoreSource<Store>) {
 *     this.#ctrl = new SubscriptionController(host, source, {
 *       subscribe: (store, onChange) => store.queue.subscribe(onChange),
 *       getValue: (store) => store.queue.tasks,
 *     });
 *   }
 *
 *   get value() { return this.#ctrl.value; }
 * }
 * ```
 */
export class SubscriptionController<Store extends AnyStore, Value> implements ReactiveController {
  readonly #host: SubscriptionControllerHost;
  readonly #config: SubscriptionControllerConfig<Store, Value>;
  readonly #consumer: ContextConsumer<Context<unknown, Store>, SubscriptionControllerHost> | null;

  #directStore: Store | null;
  #unsubscribe = noop;

  constructor(
    host: SubscriptionControllerHost,
    source: StoreSource<Store>,
    config: SubscriptionControllerConfig<Store, Value>
  ) {
    this.#host = host;
    this.#config = config;

    if (isStore(source)) {
      this.#directStore = source;
      this.#consumer = null;
    } else {
      this.#directStore = null;
      this.#consumer = new ContextConsumer(host, {
        context: source,
        callback: (store) => this.#connect(store),
        subscribe: false,
      });
    }

    host.addController(this);
  }

  get value(): Value {
    const store = this.#store;

    if (isNull(store)) {
      throw new Error('Store not available');
    }

    return this.#config.getValue(store);
  }

  get #store(): Store | null {
    if (this.#consumer) {
      return this.#consumer.value ?? null;
    }

    return this.#directStore;
  }

  hostConnected(): void {
    // For direct store, connect immediately
    // For context, ContextConsumer triggers callback when value is available
    if (this.#directStore) {
      this.#connect(this.#directStore);
    }
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: Store): void {
    this.#unsubscribe();
    this.#unsubscribe = this.#config.subscribe(store, () => {
      this.#host.requestUpdate();
    });
  }
}

export namespace SubscriptionController {
  export type Host = SubscriptionControllerHost;
  export type Config<Store extends AnyStore, Value> = SubscriptionControllerConfig<Store, Value>;
}
