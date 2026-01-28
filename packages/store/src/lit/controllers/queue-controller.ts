import type { AnyStore } from '../../core/store';
import type { StoreSource } from '../store-accessor';
import type { SubscriptionControllerHost } from './subscription-controller';
import { SubscriptionController } from './subscription-controller';

export type QueueControllerHost = SubscriptionControllerHost;

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
export class QueueController<Store extends AnyStore> {
  readonly #sub: SubscriptionController<Store, Store['queue']['tasks']>;

  constructor(host: QueueControllerHost, source: StoreSource<Store>) {
    this.#sub = new SubscriptionController(host, source, {
      subscribe: (store, onChange) => store.queue.subscribe(onChange),
      getValue: (store) => store.queue.tasks,
    });
  }

  get value(): Store['queue']['tasks'] {
    return this.#sub.value;
  }
}
