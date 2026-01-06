import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AsyncStatus, Task } from '../../core/queue';
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

// Re-export for convenience
export type { AsyncStatus };

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
  S extends AnyStore,
  K extends string & keyof InferStoreRequests<S>,
  Value,
  Request extends InferStoreRequests<S>[K] = InferStoreRequests<S>[K],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #key: K;
  readonly #stateSelector: (state: InferStoreState<S>) => Value;
  readonly #disposer = new Disposer();

  #optimistic: { value: Value; taskId: symbol } | null = null;
  #task: Task | undefined;

  constructor(host: ReactiveControllerHost, store: S, key: K, stateSelector: (state: InferStoreState<S>) => Value) {
    this.#host = host;
    this.#store = store;
    this.#key = key;
    this.#stateSelector = stateSelector;
    this.#task = findTaskByName(store.queue.tasks, key);
    host.addController(this);
  }

  get value(): OptimisticResult<Value, (value: Value) => ReturnType<Request & ((...args: any[]) => any)>> {
    type SetValue = (value: Value) => ReturnType<Request & ((...args: any[]) => any)>;

    const task = this.#task;
    const actualValue = this.#stateSelector(this.#store.state);
    const reset = this.#reset;

    // Use optimistic value if pending and we have one
    const isPending = task?.status === 'pending';
    const value = isPending && this.#optimistic ? this.#optimistic.value : actualValue;

    if (!task) {
      return { status: 'idle', value, setValue: this.#setValue as SetValue, reset };
    }

    switch (task.status) {
      case 'pending':
        return { status: 'pending', value, setValue: this.#setValue as SetValue, reset };
      case 'success':
        return { status: 'success', value, setValue: this.#setValue as SetValue, reset };
      case 'error':
        return { status: 'error', value, setValue: this.#setValue as SetValue, reset, error: task.error };
    }
  }

  #setValue = (newValue: Value): ReturnType<Request & ((...args: any[]) => any)> => {
    const pendingTaskId = Symbol('pending');
    this.#optimistic = { value: newValue, taskId: pendingTaskId };
    this.#host.requestUpdate();

    const request = (this.#store.request as InferStoreRequests<S>)[this.#key] as (
      value: Value,
    ) => ReturnType<Request & ((...args: any[]) => any)>;
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
    this.#store.queue.reset(this.#key);
  };

  hostConnected(): void {
    this.#task = findTaskByName(this.#store.queue.tasks, this.#key);

    this.#disposer.add(this.#store.subscribe(this.#stateSelector, () => {
      this.#host.requestUpdate();
    }));

    this.#disposer.add(this.#store.queue.subscribe((tasks) => {
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
    }));
  }

  hostDisconnected(): void {
    this.#disposer.dispose();
  }
}
