import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { EnsureFunction } from '@videojs/utils/types';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';
import type { Task } from '../../core/task';
import type { OptimisticResult } from '../../shared/types';
import type { StoreSource } from '../store-accessor';

import { Disposer } from '@videojs/utils/events';
import { isNull } from '@videojs/utils/predicate';

import { subscribe } from '../../core/state';
import { StoreAccessor } from '../store-accessor';

export type OptimisticControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Shows optimistic value while mutation is pending, actual value otherwise.
 * When setValue is called, immediately shows the new value while the request
 * is in flight. Reverts to actual value if the request fails.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
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
 *
 * @example Context source (from createStore)
 * ```ts
 * const { context } = createStore({ slices: [volumeSlice] });
 *
 * class VolumeSlider extends LitElement {
 *   #volume = new OptimisticController(this, context, 'setVolume', s => s.volume);
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
  readonly #host: OptimisticControllerHost;
  readonly #accessor: StoreAccessor<Store>;
  readonly #name: Name;
  readonly #selector: (state: InferStoreState<Store>) => Value;
  readonly #disposer = new Disposer();

  #optimistic: Value | null = null;
  #task: Task | undefined;

  constructor(
    host: OptimisticControllerHost,
    source: StoreSource<Store>,
    name: Name,
    selector: (state: InferStoreState<Store>) => Value,
  ) {
    this.#host = host;
    this.#name = name;
    this.#selector = selector;
    this.#accessor = new StoreAccessor(host, source, store => this.#connect(store));

    // Initialize task if store available immediately (direct store case)
    const store = this.#accessor.value;
    if (store) this.#task = store.queue.tasks[name];

    host.addController(this);
  }

  get value(): OptimisticResult<Value, (value: Value) => ReturnType<EnsureFunction<Request>>> {
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('OptimisticController: Store not available from context');
    }

    const task = this.#task;

    // Show optimistic value when set (cleared on task settlement)
    const value = this.#optimistic !== null ? this.#optimistic : this.#selector(store.state);
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
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('OptimisticController: Store not available from context');
    }

    this.#optimistic = newValue;
    this.#host.requestUpdate();

    const request = store.request[this.#name] as (value: Value) => ReturnType<EnsureFunction<Request>>;

    return request(newValue);
  };

  #reset = (): void => {
    const store = this.#accessor.value;
    if (isNull(store)) return;

    this.#optimistic = null;
    this.#host.requestUpdate();

    this.#task = store.queue.tasks[this.#name];
    if (this.#task) store.queue.reset(this.#name);
  };

  hostConnected(): void {
    this.#accessor.hostConnected();
  }

  hostDisconnected(): void {
    this.#disposer.dispose();
  }

  #connect(store: Store): void {
    this.#disposer.dispose();
    this.#task = store.queue.tasks[this.#name];

    this.#disposer.add(subscribe(store.state, () => this.#host.requestUpdate()));

    this.#disposer.add(
      subscribe(store.queue.tasks, () => {
        const newTask = store.queue.tasks[this.#name];
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
}
