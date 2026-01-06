import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AsyncStatus, Task } from '../../core/queue';
import type { AnyStore, InferStoreRequests } from '../../core/store';

import { findTaskByName } from '../../core/queue';

// ----------------------------------------
// Mutation Types
// ----------------------------------------

interface MutationBase<Mutate> {
  status: AsyncStatus;
  mutate: Mutate;
  reset: () => void;
}

export interface MutationIdle<Mutate> extends MutationBase<Mutate> {
  status: 'idle';
}

export interface MutationPending<Mutate> extends MutationBase<Mutate> {
  status: 'pending';
}

export interface MutationSuccess<Mutate, Data> extends MutationBase<Mutate> {
  status: 'success';
  data: Data;
}

export interface MutationError<Mutate> extends MutationBase<Mutate> {
  status: 'error';
  error: unknown;
}

export type MutationResult<Mutate, Data>
  = | MutationIdle<Mutate>
    | MutationPending<Mutate>
    | MutationSuccess<Mutate, Data>
    | MutationError<Mutate>;

// ----------------------------------------
// Controller
// ----------------------------------------

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
 *         ${mutation.status === 'pending' ? 'Loading...' : 'Play'}
 *       </button>
 *       ${mutation.status === 'error' ? html`<span>Error: ${mutation.error}</span>` : ''}
 *     `;
 *   }
 * }
 * ```
 */
export class MutationController<
  Store extends AnyStore,
  Key extends string & keyof InferStoreRequests<Store>,
  Mutate extends InferStoreRequests<Store>[Key] = InferStoreRequests<Store>[Key],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;
  readonly #key: Key;

  #task: Task | undefined;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: Store, key: Key) {
    this.#host = host;
    this.#store = store;
    this.#key = key;
    this.#task = findTaskByName(store.queue.tasks, key);
    host.addController(this);
  }

  get value(): MutationResult<Mutate, Awaited<ReturnType<Mutate & ((...args: any[]) => any)>>> {
    type Data = Awaited<ReturnType<Mutate & ((...args: any[]) => any)>>;

    const task = this.#task;
    const mutate = (this.#store.request as InferStoreRequests<Store>)[this.#key] as Mutate;
    const reset = this.#reset;

    if (!task) {
      return { status: 'idle', mutate, reset };
    }

    switch (task.status) {
      case 'pending':
        return { status: 'pending', mutate, reset };
      case 'success':
        return { status: 'success', mutate, reset, data: task.output as Data };
      case 'error':
        return { status: 'error', mutate, reset, error: task.error };
    }
  }

  #reset = (): void => {
    this.#store.queue.reset(this.#key);
  };

  hostConnected(): void {
    this.#task = findTaskByName(this.#store.queue.tasks, this.#key);

    this.#unsubscribe = this.#store.queue.subscribe((tasks) => {
      const newTask = findTaskByName(tasks, this.#key);
      if (newTask !== this.#task) {
        this.#task = newTask;
        this.#host.requestUpdate();
      }
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
