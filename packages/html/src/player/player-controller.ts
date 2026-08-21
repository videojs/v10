import type { PlayerStore } from '@videojs/core/dom';
import type { ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import type { InferStoreState, Selector } from '@videojs/store';
import { SnapshotController } from '@videojs/store/html';

import type { PlayerContext } from './context';

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
export class PlayerController<Store extends PlayerStore, Result = Store> {
  readonly #host: PlayerControllerHost;
  readonly #selector: Selector<InferStoreState<Store>, Result> | undefined;

  readonly #consumer: ContextConsumer<PlayerContext<Store>, PlayerControllerHost>;
  #snapshot: SnapshotController<object, Result> | null = null;

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
      callback: (store) => this.#connect(store),
      subscribe: true,
    });
  }

  get value(): Result | undefined {
    const store = this.#consumer.value;
    if (!store) return undefined;

    // Without selector: return store directly
    if (!this.#selector) return store as unknown as Result;

    // The context callback normally connects the snapshot first. Keep the
    // getter correct if a context implementation assigns value before calling
    // its callback.
    this.#connect(store);
    return this.#snapshot?.value;
  }

  get displayName(): string | undefined {
    return this.#selector?.displayName;
  }

  #connect(store: Store | undefined): void {
    if (!this.#selector) return;

    if (!store) {
      this.#snapshot?.untrack();
      return;
    }

    if (!this.#snapshot) {
      this.#snapshot = new SnapshotController(this.#host, store.$state, this.#selector as Selector<object, Result>);
      return;
    }

    this.#snapshot.track(store.$state);
  }
}

export namespace PlayerController {
  export type Host = PlayerControllerHost;

  export type Constructor<Store extends PlayerStore = PlayerStore, Result = Store> = typeof PlayerController<
    Store,
    Result
  >;
}
