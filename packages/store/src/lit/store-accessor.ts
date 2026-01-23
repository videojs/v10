import type { Context } from '@lit/context';
import { ContextConsumer } from '@lit/context';
import type { ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import type { AnyStore } from '../core/store';
import { isStore } from '../core/store';

/** A store instance or a context that provides one. */
export type StoreSource<Store extends AnyStore> = Store | Context<unknown, Store>;

export type StoreAccessorHost = ReactiveControllerHost & HTMLElement;

/**
 * Resolves a store from either a direct instance or context.
 *
 * When given a direct store, provides immediate access.
 * When given a context, sets up a ContextConsumer to receive the store.
 *
 * @example Direct store
 * ```ts
 * const accessor = new StoreAccessor(host, store, (s) => console.log('available', s));
 * accessor.value; // Store (immediately available)
 * ```
 *
 * @example Context source
 * ```ts
 * const accessor = new StoreAccessor(host, context, (s) => console.log('available', s));
 * accessor.value; // null until context provides store
 * ```
 */
export class StoreAccessor<Store extends AnyStore> {
  readonly #onAvailable: (store: Store) => void;
  readonly #consumer: ContextConsumer<Context<unknown, Store>, StoreAccessorHost> | null;

  #directStore: Store | null;

  constructor(host: StoreAccessorHost, source: StoreSource<Store>, onAvailable?: (store: Store) => void) {
    this.#onAvailable = onAvailable ?? (noop as (store: Store) => void);

    // Check if source is a store (object with subscribe) or context (symbol/string)
    if (isStore(source)) {
      this.#directStore = source;
      this.#consumer = null;
    } else {
      this.#directStore = null;
      this.#consumer = new ContextConsumer(host, {
        context: source,
        callback: (store) => this.#onAvailable(store),
        subscribe: false,
      });
    }
  }

  /** Returns the store, or null if not yet available from context. */
  get value(): Store | null {
    if (this.#consumer) {
      return this.#consumer.value ?? null;
    }
    return this.#directStore;
  }

  /**
   * Call from hostConnected to re-trigger onAvailable.
   * For context sources, the ContextConsumer handles reconnect automatically.
   * For direct stores, this manually triggers onAvailable.
   */
  hostConnected(): void {
    // For direct store, trigger onAvailable on connect/reconnect
    if (this.#directStore) {
      this.#onAvailable(this.#directStore);
    }
    // Context consumer handles its own reconnect via callback
  }
}
