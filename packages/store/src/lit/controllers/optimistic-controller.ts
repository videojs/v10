import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { EnsureFunction } from '@videojs/utils/types';
import type { Task } from '../../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';

import { Disposer } from '@videojs/utils/events';

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
  Name extends keyof InferStoreRequests<Store>,
  Value,
  Request extends InferStoreRequests<Store>[Name] = InferStoreRequests<Store>[Name],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;
  readonly #name: Name;
  readonly #selector: (state: InferStoreState<Store>) => Value;
  readonly #disposer = new Disposer();

  #optimistic: Value | null = null;
  #task: Task | undefined;

  constructor(
    host: ReactiveControllerHost,
    store: Store,
    name: Name,
    selector: (state: InferStoreState<Store>) => Value,
  ) {
    this.#host = host;
    this.#store = store;
    this.#name = name;
    this.#selector = selector;
    this.#task = store.queue.tasks[name];
    host.addController(this);
  }

  get value(): OptimisticResult<Value, (value: Value) => ReturnType<EnsureFunction<Request>>> {
    const task = this.#task;

    // Show optimistic value when set (cleared on task settlement)
    const value = this.#optimistic !== null ? this.#optimistic : this.#selector(this.#store.state);
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
    this.#optimistic = newValue;
    this.#host.requestUpdate();

    const request = this.#store.request[this.#name] as (value: Value) => ReturnType<EnsureFunction<Request>>;

    return request(newValue);
  };

  #reset = (): void => {
    this.#optimistic = null;
    this.#host.requestUpdate();

    this.#task = this.#store.queue.tasks[this.#name];
    if (this.#task) this.#store.queue.reset(this.#name);
  };

  hostConnected() {
    this.#task = this.#store.queue.tasks[this.#name];

    this.#disposer.add(this.#store.subscribe(this.#selector, () => this.#host.requestUpdate()));

    this.#disposer.add(
      this.#store.queue.subscribe((tasks) => {
        const newTask = tasks[this.#name];
        if (newTask !== this.#task) {
          this.#task = newTask;

          // Clear optimistic value when task settles
          if (this.#optimistic !== null && newTask?.status !== 'pending') {
            this.#optimistic = null;
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
