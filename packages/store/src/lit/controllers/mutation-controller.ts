import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { EnsureFunction } from '@videojs/utils/types';
import type { AnyStore, InferStoreRequests } from '../../core/store';
import type { Task } from '../../core/task';
import type { MutationResult } from '../../shared/types';
import type { StoreSource } from '../store-accessor';

import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';

import { subscribeKeys } from '../../core/state';
import { StoreAccessor } from '../store-accessor';

export type MutationControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Tracks a mutation's status with discriminated union result.
 * Triggers host updates when the task status changes.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
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
 *
 * @example Context source (from createStore)
 * ```ts
 * const { context } = createStore({ slices: [playbackSlice] });
 *
 * class MyElement extends LitElement {
 *   #playMutation = new MutationController(this, context, 'play');
 * }
 * ```
 */
export class MutationController<
  Store extends AnyStore,
  Name extends keyof InferStoreRequests<Store>,
  Mutate extends InferStoreRequests<Store>[Name] = InferStoreRequests<Store>[Name],
> implements ReactiveController {
  readonly #host: MutationControllerHost;
  readonly #accessor: StoreAccessor<Store>;
  readonly #name: Name;

  #task: Task | undefined;
  #unsubscribe = noop;

  constructor(host: MutationControllerHost, source: StoreSource<Store>, name: Name) {
    this.#host = host;
    this.#name = name;
    this.#accessor = new StoreAccessor(host, source, store => this.#connect(store));

    // Initialize task if store available immediately (direct store case)
    const store = this.#accessor.value;
    if (store) this.#task = store.queue.tasks[name];

    host.addController(this);
  }

  get value(): MutationResult<Mutate, Awaited<ReturnType<EnsureFunction<Mutate>>>> {
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('MutationController: Store not available from context');
    }

    const task = this.#task;

    const base = {
      mutate: store.request[this.#name] as Mutate,
      reset: this.#reset,
    };

    if (task?.status === 'success') {
      return {
        status: 'success',
        ...base,
        data: task.output as Awaited<ReturnType<EnsureFunction<Mutate>>>,
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

  #reset = (): void => {
    const store = this.#accessor.value;
    if (store) store.queue.reset(this.#name);
  };

  hostConnected(): void {
    this.#accessor.hostConnected();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: Store): void {
    this.#unsubscribe();
    this.#task = store.queue.tasks[this.#name];

    this.#unsubscribe = subscribeKeys(store.queue.tasks, [this.#name], () => {
      this.#task = store.queue.tasks[this.#name];
      this.#host.requestUpdate();
    });
  }
}
