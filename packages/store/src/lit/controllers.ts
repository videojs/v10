import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { Task, TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { findTaskByName } from '../core/queue';

// ----------------------------------------
// Mutation Types
// ----------------------------------------

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

interface MutationBase<Mutate> {
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
// Optimistic Types
// ----------------------------------------

export type OptimisticStatus = 'idle' | 'pending' | 'success' | 'error';

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
// Controllers
// ----------------------------------------

/**
 * Subscribes to a selected portion of store state.
 * Triggers host updates when the selected value changes.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #paused = new SelectorController(this, store, s => s.paused);
 *
 *   render() {
 *     return html`<button>${this.#paused.value ? 'Play' : 'Pause'}</button>`;
 *   }
 * }
 * ```
 */
export class SelectorController<S extends AnyStore, T> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #selector: (state: InferStoreState<S>) => T;

  #value: T;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: S, selector: (state: InferStoreState<S>) => T) {
    this.#host = host;
    this.#store = store;
    this.#selector = selector;
    this.#value = selector(store.state);
    host.addController(this);
  }

  get value(): T {
    return this.#value;
  }

  hostConnected(): void {
    // Sync value on reconnect to avoid stale state
    this.#value = this.#selector(this.#store.state);

    this.#unsubscribe = this.#store.subscribe(this.#selector, (value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}

/**
 * Provides access to a store request by key.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #play = new RequestController(this, store, 'play');
 *
 *   render() {
 *     return html`<button @click=${() => this.#play.value()}>Play</button>`;
 *   }
 * }
 * ```
 */
export class RequestController<
  S extends AnyStore,
  K extends string & keyof InferStoreRequests<S>,
> implements ReactiveController {
  readonly #store: S;
  readonly #key: K;

  constructor(host: ReactiveControllerHost, store: S, key: K) {
    this.#store = store;
    this.#key = key;
    host.addController(this);
  }

  get value(): InferStoreRequests<S>[K] {
    return (this.#store.request as InferStoreRequests<S>)[this.#key];
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}

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
  S extends AnyStore,
  K extends string & keyof InferStoreRequests<S>,
  Mutate extends InferStoreRequests<S>[K] = InferStoreRequests<S>[K],
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #key: K;

  #task: Task | undefined;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: S, key: K) {
    this.#host = host;
    this.#store = store;
    this.#key = key;
    this.#task = findTaskByName(store.queue.tasks, key);
    host.addController(this);
  }

  get value(): MutationResult<Mutate, Awaited<ReturnType<Mutate & ((...args: any[]) => any)>>> {
    type Data = Awaited<ReturnType<Mutate & ((...args: any[]) => any)>>;

    const task = this.#task;
    const mutate = (this.#store.request as InferStoreRequests<S>)[this.#key] as Mutate;
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

/**
 * Shows optimistic value while mutation is pending, actual value otherwise.
 *
 * @example
 * ```ts
 * class VolumeSlider extends LitElement {
 *   #volume = new OptimisticController(this, store, 'setVolume', s => s.volume);
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

  #optimistic: { value: Value; taskId: symbol } | null = null;
  #task: Task | undefined;
  #stateUnsubscribe: (() => void) | null = null;
  #queueUnsubscribe: (() => void) | null = null;

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

    this.#stateUnsubscribe = this.#store.subscribe(this.#stateSelector, () => {
      this.#host.requestUpdate();
    });

    this.#queueUnsubscribe = this.#store.queue.subscribe((tasks) => {
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
    });
  }

  hostDisconnected(): void {
    this.#stateUnsubscribe?.();
    this.#stateUnsubscribe = null;
    this.#queueUnsubscribe?.();
    this.#queueUnsubscribe = null;
  }
}
