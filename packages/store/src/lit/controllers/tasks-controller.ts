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
 * @example Context source
 * ```ts
 * const { context } = createStore({ features: [playbackFeature] });
 *
 * class MyElement extends LitElement {
 *   #tasks = new TasksController(this, context);
 * }
 * ```
 */
export class TasksController<Store extends AnyStore> implements ReactiveController {
  readonly #host: TasksControllerHost;
  readonly #accessor: StoreAccessor<Store>;

  #unsubscribe = noop;

  constructor(host: TasksControllerHost, source: StoreSource<Store>) {
    this.#host = host;
    this.#accessor = new StoreAccessor(host, source, store => this.#connect(store));
    host.addController(this);
  }

  get value(): Store['queue']['tasks']['current'] {
    const store = this.#accessor.value;

    if (isNull(store)) {
      throw new Error('TasksController: Store not available from context');
    }

    return store.queue.tasks.current;
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
    this.#unsubscribe = store.queue.tasks.subscribe(() => {
      this.#host.requestUpdate();
    });
  }
}
