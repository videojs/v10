import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { EnsureFunction } from '@videojs/utils/types';
import type { Task } from '../../core/queue';
import type { AnyStore, InferStoreRequests } from '../../core/store';
import type { MutationResult } from '../../shared/types';

import { noop } from '@videojs/utils/function';

/**
 * Tracks a mutation's status with discriminated union result.
 * Triggers host updates when the task status changes.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #playMutation = new MutationController(this, store, 'play');
 *
 *   render() {
 *     const mutation = this.#playMutation.value;
 *     return html`
 *       <button
 *         @click=${() => mutation.mutate()}
 *         ?disabled=${mutation.status === 'pending'}
 *       >
 *        ...
 *       </button>
 *     `;
 *   }
 * }
 * ```
 */
export class MutationController<
  Store extends AnyStore,
  Name extends keyof InferStoreRequests<Store>,
  Mutate extends InferStoreRequests<Store>[Name] = InferStoreRequests<Store>[Name],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;
  readonly #name: Name;

  #task: Task | undefined;
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, store: Store, name: Name) {
    this.#host = host;
    this.#store = store;
    this.#name = name;
    this.#task = store.queue.tasks[name];
    host.addController(this);
  }

  get value(): MutationResult<Mutate, Awaited<ReturnType<EnsureFunction<Mutate>>>> {
    const task = this.#task;

    const base = {
      mutate: this.#store.request[this.#name] as Mutate,
      reset: this.#reset,
    };

    if (task?.status === 'success') {
      return {
        status: 'success',
        ...base,
        data: task.output as any,
      };
    }

    if (task?.status === 'error') {
      return {
        status: 'error',
        ...base,
        error: task.error,
      };
    }

    return {
      status: task?.status ?? 'idle',
      ...base,
    };
  }

  #reset = () => {
    this.#store.queue.reset(this.#name);
  };

  hostConnected() {
    this.#task = this.#store.queue.tasks[this.#name];

    this.#unsubscribe = this.#store.queue.subscribe((tasks) => {
      const newTask = tasks[this.#name];
      if (newTask !== this.#task) {
        this.#task = newTask;
        this.#host.requestUpdate();
      }
    });
  }

  hostDisconnected() {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }
}
