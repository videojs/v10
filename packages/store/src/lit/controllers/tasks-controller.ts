import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore } from '../../core/store';

import { noop } from '@videojs/utils/function';

/**
 * Subscribes to task state changes.
 *
 * Triggers host updates when tasks change.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #tasks = new TasksController(this, store);
 *
 *   render() {
 *     const playTask = this.#tasks.value.play;
 *     const isPending = playTask?.status === 'pending';
 *     return html`<button ?disabled=${isPending}>Play</button>`;
 *   }
 * }
 * ```
 */
export class TasksController<Store extends AnyStore> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;

  #value: Store['queue']['tasks'];
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, store: Store) {
    this.#host = host;
    this.#store = store;
    this.#value = store.queue.tasks;
    host.addController(this);
  }

  get value(): Store['queue']['tasks'] {
    return this.#value;
  }

  hostConnected() {
    // Sync value on reconnect to avoid stale state
    this.#value = this.#store.queue.tasks;
    this.#unsubscribe = this.#store.queue.subscribe((tasks) => {
      this.#value = tasks;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }
}
