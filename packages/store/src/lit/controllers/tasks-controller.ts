import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';

import { StoreAccessor } from '../store-accessor';

export type TasksControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Subscribes to task state changes.
 * Triggers host updates when tasks change.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
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
 *
 * @example Context source (from createStore)
 * ```ts
 * const { context } = createStore({ slices: [playbackSlice] });
 *
 * class MyElement extends LitElement {
 *   #tasks = new TasksController(this, context);
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
  readonly #host: TasksControllerHost;
  readonly #accessor: StoreAccessor<Store>;

  #value: Store['queue']['tasks'] | undefined;
  #unsubscribe = noop;

  constructor(host: TasksControllerHost, source: StoreSource<Store>) {
    this.#host = host;
    this.#accessor = new StoreAccessor(host, source, store => this.#connect(store));

    // Initialize value if store available immediately (direct store case)
    const store = this.#accessor.value;
    if (store) this.#value = store.queue.tasks;

    host.addController(this);
  }

  get value(): Store['queue']['tasks'] {
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('TasksController: Store not available from context');
    }
    return this.#value as Store['queue']['tasks'];
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
    this.#value = store.queue.tasks;
    this.#unsubscribe = store.queue.subscribe((tasks) => {
      this.#value = tasks;
      this.#host.requestUpdate();
    });
  }
}
