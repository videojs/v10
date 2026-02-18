import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import type { Selector } from '../../core/shallow-equal';
import type { AnyStore, InferStoreState } from '../../core/store';
import { StoreAccessor, type StoreSource } from '../store-accessor';
import { SnapshotController } from './snapshot-controller';

export type StoreControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Access store state and actions.
 *
 * Without selector: Returns the store, does NOT subscribe to changes.
 * With selector: Returns selected state, triggers update when selected state changes (shallowEqual).
 *
 * @example
 * ```ts
 * // Store access (no subscription) - access actions
 * class Controls extends LitElement {
 *   #store = new StoreController(this, storeSource);
 *
 *   handleClick() {
 *     this.#store.value.setVolume(0.5);
 *   }
 * }
 *
 * // Selector-based subscription - re-renders when playback changes
 * class PlayButton extends LitElement {
 *   #playback = new StoreController(this, storeSource, selectPlayback);
 *
 *   render() {
 *     const playback = this.#playback.value;
 *     if (!playback) return nothing;
 *     return html`<button @click=${playback.toggle}>
 *       ${playback.paused ? 'Play' : 'Pause'}
 *     </button>`;
 *   }
 * }
 * ```
 */
export class StoreController<Store extends AnyStore, Result = Store> implements ReactiveController {
  readonly #host: StoreControllerHost;
  readonly #selector: Selector<InferStoreState<Store>, Result> | undefined;
  readonly #accessor: StoreAccessor<Store>;

  #snapshot: SnapshotController<object, Result> | null = null;

  constructor(host: StoreControllerHost, source: StoreSource<Store>);
  constructor(
    host: StoreControllerHost,
    source: StoreSource<Store>,
    selector: Selector<InferStoreState<Store>, Result>
  );
  constructor(
    host: StoreControllerHost,
    source: StoreSource<Store>,
    selector?: Selector<InferStoreState<Store>, Result>
  ) {
    this.#host = host;
    this.#selector = selector;
    this.#accessor = new StoreAccessor(host, source, (store) => this.#connect(store));
    host.addController(this);
  }

  get value(): Result {
    const store = this.#accessor.value;

    if (isNull(store)) {
      throw new Error('Store not available');
    }

    // Without selector: return store
    if (isUndefined(this.#selector)) {
      return store as unknown as Result;
    }

    // With selector: delegate to snapshot controller
    return this.#snapshot!.value;
  }

  hostConnected(): void {
    // StoreAccessor + SnapshotController handle their own lifecycle.
  }

  #connect(store: Store): void {
    if (isUndefined(this.#selector)) return;

    if (!this.#snapshot) {
      this.#snapshot = new SnapshotController(this.#host, store.$state, this.#selector as Selector<object, Result>);
    } else {
      this.#snapshot.track(store.$state);
    }
  }
}

export namespace StoreController {
  export type Host = StoreControllerHost;
}
