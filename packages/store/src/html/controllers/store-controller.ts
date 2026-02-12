import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { noop } from '@videojs/utils/function';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import { shallowEqual } from '../../core/shallow-equal';
import type { AnyStore, InferStoreState } from '../../core/store';
import { StoreAccessor, type StoreSource } from '../store-accessor';

export type StoreControllerHost = ReactiveControllerHost & HTMLElement;

export type Selector<State, Result> = (state: State) => Result;

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

  #cached: Result | undefined;
  #unsubscribe = noop;

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

    // With selector: return cached selected value
    this.#cached ??= this.#selector(store.state as InferStoreState<Store>);
    return this.#cached;
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
    this.#cached = undefined;
  }

  #connect(store: Store): void {
    this.#unsubscribe();

    // Without selector: no subscription
    if (isUndefined(this.#selector)) {
      return;
    }

    // With selector: subscribe with shallowEqual comparison
    const selector = this.#selector;

    this.#cached = selector(store.state as InferStoreState<Store>);

    this.#unsubscribe = store.subscribe(() => {
      const next = selector(store.state as InferStoreState<Store>);
      if (!shallowEqual(this.#cached, next)) {
        this.#cached = next;
        this.#host.requestUpdate();
      }
    });
  }
}

export namespace StoreController {
  export type Host = StoreControllerHost;
}
