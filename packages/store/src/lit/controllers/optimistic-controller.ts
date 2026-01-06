import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { EnsureFunction } from '@videojs/utils/types';
import type { Task } from '../../core/queue';

import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';

import { Disposer } from '@videojs/utils/events';
import { findTaskByName } from '../../core/queue';

// ----------------------------------------
// Optimistic Types
// ----------------------------------------

interface OptimisticBase<Value, SetValue> {
  value: Value;
  setValue: SetValue;
  reset: () => void;
}

export interface OptimisticIdle<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'idle';
}

export interface OptimisticPending<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'pending';
}

export interface OptimisticSuccess<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'success';
}

export interface OptimisticError<Value, SetValue> extends OptimisticBase<Value, SetValue> {
  status: 'error';
  error: unknown;
}

export type OptimisticResult<Value, SetValue>
  = | OptimisticIdle<Value, SetValue>
    | OptimisticPending<Value, SetValue>
    | OptimisticSuccess<Value, SetValue>
    | OptimisticError<Value, SetValue>;

// ----------------------------------------
// Controller
// ----------------------------------------

/**
 * Shows optimistic value while mutation is pending, actual value otherwise.
 * When setValue is called, immediately shows the new value while the request
 * is in flight. Reverts to actual value if the request fails.
 *
 * @example
 * ```ts
 * class VolumeSlider extends LitElement {
 *   #volume = new OptimisticController(this, store, 'setVolume', s => s.volume);
 *
 *   render() {
 *     const { value, setValue, status } = this.#volume.value;
 *     return html`
 *       <input
 *         type="range"
 *         .value=${value}
 *         @input=${(e) => setValue(Number(e.target.value))}
 *         style="opacity: ${status === 'pending' ? 0.5 : 1}"
 *       />
 *     `;
 *   }
 * }
 * ```
 */
export class OptimisticController<
  Store extends AnyStore,
  Key extends keyof InferStoreRequests<Store>,
  Value,
  Request extends InferStoreRequests<Store>[Key] = InferStoreRequests<Store>[Key],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;
  readonly #key: Key;
  readonly #selector: (state: InferStoreState<Store>) => Value;
  readonly #disposer = new Disposer();

  #optimistic: { value: Value; taskId: symbol } | null = null;
  #task: Task | undefined;

  constructor(
    host: ReactiveControllerHost,
    store: Store,
    key: Key,
    selector: (state: InferStoreState<Store>) => Value,
  ) {
    this.#host = host;
    this.#store = store;
    this.#key = key;
    this.#selector = selector;
    this.#task = findTaskByName(store.queue.tasks, key);
    host.addController(this);
  }

  get value(): OptimisticResult<Value, (value: Value) => ReturnType<EnsureFunction<Request>>> {
    const task = this.#task;

    const isPending = task?.status === 'pending';

    const value = isPending && this.#optimistic
      ? this.#optimistic.value
      : this.#selector(this.#store.state);

    const base = {
      value,
      setValue: this.#setValue,
      reset: this.#reset,
    };

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

  #setValue = (newValue: Value): ReturnType<EnsureFunction<Request>> => {
    const pendingTaskId = Symbol('@videojs/id');

    this.#optimistic = { value: newValue, taskId: pendingTaskId };
    this.#host.requestUpdate();

    const request = this.#store.request[this.#key] as (
      value: Value,
    ) => ReturnType<EnsureFunction<Request>>;

    const promise = request(newValue);

    // After microtask, update taskId to match actual task
    queueMicrotask(() => {
      const currentTask = findTaskByName(this.#store.queue.tasks, this.#key);
      if (currentTask?.status === 'pending' && this.#optimistic?.taskId === pendingTaskId) {
        this.#optimistic = { value: newValue, taskId: currentTask.id };
      }
    });

    return promise;
  };

  #reset = (): void => {
    this.#optimistic = null;

    const task = findTaskByName(this.#store.queue.tasks, this.#key);
    if (task) this.#store.queue.reset(task.key);
  };

  hostConnected() {
    this.#task = findTaskByName(this.#store.queue.tasks, this.#key);

    this.#disposer.add(
      this.#store.subscribe(this.#selector, () => this.#host.requestUpdate()),
    );

    this.#disposer.add(
      this.#store.queue.subscribe((tasks) => {
        const newTask = findTaskByName(tasks, this.#key);
        if (newTask !== this.#task) {
          this.#task = newTask;

          // Clear optimistic value when task settles or changes
          if (this.#optimistic) {
            const isPending = newTask?.status === 'pending';
            const isSameTask = newTask?.id === this.#optimistic.taskId;

            if (!isPending || !isSameTask) {
              this.#optimistic = null;
            }
          }

          this.#host.requestUpdate();
        }
      }),
    );
  }

  hostDisconnected() {
    this.#disposer.dispose();
  }
}
