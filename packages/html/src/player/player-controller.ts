import { ContextConsumer } from '@lit/context';
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { PlayerStore } from '@videojs/core/dom';
import type { InferStoreState, Selector } from '@videojs/store';
import { StoreController } from '@videojs/store/lit';

import type { PlayerContext, PlayerContextValue } from './context';

export type PlayerControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Reactive controller for accessing player store state.
 *
 * Without selector: Returns the store, does NOT subscribe to changes.
 * With selector: Returns selected state, subscribes with shallowEqual comparison.
 *
 * @example
 * ```ts
 * // Store access (no subscription)
 * class Controls extends MediaElement {
 *   #player = new PlayerController(this, playerContext);
 *
 *   handleClick() {
 *     this.#player.value.setVolume(0.5);
 *   }
 * }
 *
 * // Selector-based subscription
 * class PlayButton extends MediaElement {
 *   #playback = new PlayerController(this, playerContext, selectPlayback);
 * }
 * ```
 */
export class PlayerController<Store extends PlayerStore, Result = Store> implements ReactiveController {
  readonly #host: PlayerControllerHost;
  readonly #selector: Selector<InferStoreState<Store>, Result> | undefined;

  #consumer: ContextConsumer<PlayerContext<Store>, PlayerControllerHost>;
  #store: StoreController<Store, Result> | null = null;

  constructor(host: PlayerControllerHost, context: PlayerContext<Store>);
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

  get value(): Result | undefined {
    const ctx = this.#consumer.value;
    if (!ctx) return undefined;

    // Without selector: return store directly
    if (!this.#selector) return ctx.store as unknown as Result;

    // With selector: use StoreController
    return this.#store?.value;
  }

  hostConnected(): void {
    const ctx = this.#consumer.value;
    if (ctx) this.#connect(ctx);
  }

  hostDisconnected(): void {
    this.#store = null;
  }

  #connect(ctx: PlayerContextValue<Store> | undefined): void {
    if (!ctx) return;

    // Create StoreController with the store directly
    if (!this.#store && this.#selector) {
      this.#store = new StoreController(this.#host, ctx.store, this.#selector);
    }
  }
}

export namespace PlayerController {
  export type Host = PlayerControllerHost;

  export type Constructor<Store extends PlayerStore = PlayerStore, Result = Store> = typeof PlayerController<
    Store,
    Result
  >;
}
