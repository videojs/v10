import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore } from '../../core/store';
import { StoreAccessor, type StoreSource } from '../store-accessor';

export type SubscriptionControllerHost = ReactiveControllerHost & HTMLElement;

export interface SubscriptionControllerConfig<Store extends AnyStore, Value> {
  getValue: (store: Store) => Value;
  subscribe: (store: Store, onChange: () => void) => () => void;
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
 *   #ctrl: SubscriptionController<Store, Tasks>;
 *
 *   constructor(host: Host, source: StoreSource<Store>) {
 *     this.#ctrl = new SubscriptionController(host, source, {
 *       subscribe: (store, onChange) => store.queue.subscribe(onChange),
 *       getValue: (store) => store.queue.tasks,
 *     });
 *   }
 *
 *   get value() {
 *     return this.#ctrl.value;
 *   }
 * }
 * ```
 */
export class SubscriptionController<Store extends AnyStore, Value> implements ReactiveController {
  readonly #host: SubscriptionControllerHost;
  readonly #config: SubscriptionControllerConfig<Store, Value>;
  readonly #accessor: StoreAccessor<Store>;

  #unsubscribe = noop;

  constructor(
    host: SubscriptionControllerHost,
    source: StoreSource<Store>,
    config: SubscriptionControllerConfig<Store, Value>
  ) {
    this.#host = host;
    this.#config = config;
    this.#accessor = new StoreAccessor(host, source, (store) => this.#connect(store));

    host.addController(this);
  }

  get value(): Value {
    const store = this.#accessor.value;

    if (isNull(store)) {
      throw new Error('Store not available');
    }

    return this.#config.getValue(store);
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
