import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { TasksRecord } from '../../core/queue';
import type { AnyStore, InferStoreTasks } from '../../core/store';

/**
 * Subscribes to task state changes.
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
export class TasksController<S extends AnyStore> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;

  #value: TasksRecord<InferStoreTasks<S>>;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: S) {
    this.#host = host;
    this.#store = store;
    this.#value = store.queue.tasks as TasksRecord<InferStoreTasks<S>>;
    host.addController(this);
  }

  get value(): TasksRecord<InferStoreTasks<S>> {
    return this.#value;
  }

  hostConnected(): void {
    // Sync value on reconnect to avoid stale state
    this.#value = this.#store.queue.tasks as TasksRecord<InferStoreTasks<S>>;

    this.#unsubscribe = this.#store.queue.subscribe((tasks) => {
      this.#value = tasks as TasksRecord<InferStoreTasks<S>>;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
