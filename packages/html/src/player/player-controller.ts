import type { PlayerStore } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import type { InferStoreState, Selector } from '@videojs/store';
import { StoreController } from '@videojs/store/html';

import type { PlayerContext } from './context';

/** Host requirements for `PlayerController` — a reactive controller host that is also an `HTMLElement`. */
export type PlayerControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Reactive controller that resolves the player store from context and optionally subscribes via a selector.
 *
 * Without a selector, `value` returns the store directly and does not subscribe to state changes.
 * With a selector, `value` returns the selected slice and the host re-renders when it changes
 * (compared with `shallowEqual`).
 */
export class PlayerController<Store extends PlayerStore, Result = Store> implements ReactiveController {
  readonly #host: PlayerControllerHost;
  readonly #selector: Selector<InferStoreState<Store>, Result> | undefined;

  #consumer: ContextConsumer<PlayerContext<Store>, PlayerControllerHost>;
  #store: StoreController<Store, Result> | null = null;

  /**
   * @label Without Selector
   * @param host - The host element that owns this controller.
   * @param context - Player context to resolve the store from.
   */
  constructor(host: PlayerControllerHost, context: PlayerContext<Store>);
  /**
   * @label With Selector
   * @param host - The host element that owns this controller.
   * @param context - Player context to resolve the store from.
   * @param selector - Derives a value from the player store state.
   */
  constructor(
    host: PlayerControllerHost,
    context: PlayerContext<Store>,
    selector: Selector<InferStoreState<Store>, Result>
  );
  constructor(
    host: PlayerControllerHost,
    context: PlayerContext<Store>,
    selector?: Selector<InferStoreState<Store>, Result>
  ) {
    this.#host = host;
    this.#selector = selector;

    this.#consumer = new ContextConsumer(host, {
      context,
      callback: (ctx) => this.#connect(ctx),
      subscribe: true,
    });

    host.addController(this);
  }

  /** Current value — the store itself, or the selector's projection when one was provided. */
  get value(): Result | undefined {
    const store = this.#consumer.value;
    if (!store) return undefined;

    // Without selector: return store directly
    if (!this.#selector) return store as unknown as Result;

    // With selector: use StoreController
    return this.#store?.value;
  }

  /** Display name of the active selector, when set. Used for dev diagnostics. */
  get displayName(): string | undefined {
    return this.#selector?.displayName;
  }

  /** Reactive controller hook — connects to the store once context is available. */
  hostConnected(): void {
    const store = this.#consumer.value;
    if (store) this.#connect(store);
  }

  /** Reactive controller hook — releases the selector-bound store subscription. */
  hostDisconnected(): void {
    this.#store = null;
  }

  #connect(store: Store): void {
    if (!this.#store && this.#selector) {
      this.#store = new StoreController(this.#host, store, this.#selector);
    }
  }
}

export namespace PlayerController {
  /** Host requirements for a `PlayerController` instance. */
  export type Host = PlayerControllerHost;

  /** Constructor signature for `PlayerController` bound to a specific store and result shape. */
  export type Constructor<Store extends PlayerStore = PlayerStore, Result = Store> = typeof PlayerController<
    Store,
    Result
  >;
}
