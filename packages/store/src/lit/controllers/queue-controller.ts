import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { StoreAccessor } from '../store-accessor';

export type QueueControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Subscribes to queue task changes.
 * Triggers host updates when tasks change.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
 * ```ts
 * class MyElement extends LitElement {
 *   #queue = new QueueController(this, store);
 *
 *   render() {
 *     const playTask = this.#queue.value.play;
 *     const isPending = playTask?.status === 'pending';
 *     return html`<button ?disabled=${isPending}>Play</button>`;
 *   }
 * }
 * ```
 *
 * @example Context source
 * ```ts
 * const { context } = createStore({ features: [playbackFeature] });
 *
 * class MyElement extends LitElement {
 *   #queue = new QueueController(this, context);
 * }
 * ```
 */
export class QueueController<Store extends AnyStore> implements ReactiveController {
  readonly #host: QueueControllerHost;
  readonly #accessor: StoreAccessor<Store>;

  #unsubscribe = noop;

  constructor(host: QueueControllerHost, source: StoreSource<Store>) {
    this.#host = host;
    this.#accessor = new StoreAccessor(host, source, (store) => this.#connect(store));
    host.addController(this);
  }

  get value(): Store['queue']['tasks'] {
    const store = this.#accessor.value;

    if (isNull(store)) {
      throw new Error('QueueController: Store not available from context');
    }

    return store.queue.tasks;
  }

  hostConnected(): void {
    this.#accessor.hostConnected();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: Store): void {
    this.#unsubscribe();
    this.#unsubscribe = store.queue.subscribe(() => {
      this.#host.requestUpdate();
    });
  }
}
