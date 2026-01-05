import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { Task, TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { isUndefined } from '@videojs/utils/predicate';

// ----------------------------------------
// Mutation Types
// ----------------------------------------

/**
 * Status of a mutation.
 */
export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Result returned by `MutationController.value`.
 */
export interface MutationResult<Mutate extends (...args: any[]) => any> {
  /** The mutation function to call. */
  mutate: Mutate;
  /** Current status of the mutation. */
  status: MutationStatus;
  /** True if the mutation is currently pending. */
  isPending: boolean;
  /** True if the mutation completed successfully. */
  isSuccess: boolean;
  /** True if the mutation failed. */
  isError: boolean;
  /** The result data if mutation was successful. */
  data: Awaited<ReturnType<Mutate>> | undefined;
  /** The error if mutation failed. */
  error: unknown;
  /** Clears the settled state (data/error) for this mutation. */
  reset: () => void;
}

// ----------------------------------------
// Optimistic Types
// ----------------------------------------

/**
 * Result returned by `OptimisticController.value`.
 */
export interface OptimisticResult<Value, SetValue extends (value: Value) => any> {
  /** The current value (optimistic if pending, actual otherwise). */
  value: Value;
  /** Function to set the value optimistically and trigger mutation. */
  setValue: SetValue;
  /** True if the mutation is currently pending. */
  isPending: boolean;
  /** True if the last mutation failed. */
  isError: boolean;
  /** The error if the last mutation failed. */
  error: unknown;
  /** Clears the error state. */
  reset: () => void;
}

// ----------------------------------------
// Helpers
// ----------------------------------------

/**
 * Helper to extract the request key from a selector.
 */
function extractRequestKey<S extends AnyStore>(
  store: S,
  selector: (requests: InferStoreRequests<S>) => (...args: any[]) => any,
): string {
  const requests = store.request as InferStoreRequests<S>;
  let capturedKey: string | undefined;

  const proxy = new Proxy(requests as object, {
    get(_target, prop) {
      if (typeof prop === 'string') {
        capturedKey = prop;
      }
      return (requests as Record<string | symbol, unknown>)[prop];
    },
  });

  selector(proxy as InferStoreRequests<S>);

  if (!capturedKey) {
    throw new Error('Selector must access a request property');
  }

  return capturedKey;
}

// ----------------------------------------
// Controllers
// ----------------------------------------

/**
 * Reactive controller that subscribes to store state changes.
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

  /**
   * Current selected value.
   */
  get value(): T {
    return this.#value;
  }

  hostConnected(): void {
    // Sync current value on reconnect to avoid stale state
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
 * Reactive controller that provides access to store requests.
 * Returns the full request map or a selected request.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #request = new RequestController(this, store);
 *
 *   render() {
 *     return html`<button @click=${() => this.#request.value.play()}>Play</button>`;
 *   }
 * }
 *
 * // With selector
 * class MyElement extends LitElement {
 *   #play = new RequestController(this, store, r => r.play);
 *
 *   render() {
 *     return html`<button @click=${() => this.#play.value()}>Play</button>`;
 *   }
 * }
 * ```
 */
export class RequestController<S extends AnyStore, T = InferStoreRequests<S>> implements ReactiveController {
  readonly #store: S;
  readonly #selector: ((requests: InferStoreRequests<S>) => T) | undefined;

  constructor(host: ReactiveControllerHost, store: S, selector?: (requests: InferStoreRequests<S>) => T) {
    this.#store = store;
    this.#selector = selector;

    // Register with host for lifecycle management
    host.addController(this);
  }

  /**
   * Request map or selected request.
   */
  get value(): T {
    const requests = this.#store.request as InferStoreRequests<S>;

    if (isUndefined(this.#selector)) {
      return requests as T;
    }

    return this.#selector(requests);
  }

  // No-op - requests don't change, no subscription needed
  hostConnected(): void {}
  hostDisconnected(): void {}
}

/**
 * Reactive controller that subscribes to task state changes.
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

  /**
   * Current tasks map.
   */
  get value(): TasksRecord<InferStoreTasks<S>> {
    return this.#value;
  }

  hostConnected(): void {
    // Sync current value on reconnect to avoid stale state
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
 * Reactive controller that tracks a mutation's status.
 * Triggers host updates when the task status changes.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #playMutation = new MutationController(this, store, r => r.play);
 *
 *   render() {
 *     const { mutate, isPending, isError } = this.#playMutation.value;
 *     return html`
 *       <button @click=${() => mutate()} ?disabled=${isPending}>
 *         ${isPending ? 'Loading...' : 'Play'}
 *       </button>
 *       ${isError ? html`<span>Error occurred</span>` : ''}
 *     `;
 *   }
 * }
 * ```
 */
export class MutationController<
  S extends AnyStore,
  Selector extends (requests: InferStoreRequests<S>) => (...args: any[]) => any,
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #requestKey: string;
  readonly #mutate: ReturnType<Selector>;

  #task: Task | undefined;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: S, selector: Selector) {
    this.#host = host;
    this.#store = store;
    this.#requestKey = extractRequestKey(store, selector);
    this.#mutate = selector(store.request as InferStoreRequests<S>) as ReturnType<Selector>;
    this.#task = store.queue.tasks[this.#requestKey];

    host.addController(this);
  }

  /**
   * Current mutation result.
   */
  get value(): MutationResult<ReturnType<Selector>> {
    type Mutate = ReturnType<Selector>;
    type Output = Awaited<ReturnType<Mutate>>;

    const task = this.#task;
    const status: MutationStatus = isUndefined(task) ? 'idle' : task.status;
    const isPending = status === 'pending';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    const data: Output | undefined = isSuccess && task?.status === 'success' ? (task.output as Output) : undefined;
    const error: unknown = isError && task?.status === 'error' ? task.error : undefined;

    return {
      mutate: this.#mutate,
      status,
      isPending,
      isSuccess,
      isError,
      data,
      error,
      reset: this.#reset,
    };
  }

  #reset = (): void => {
    this.#store.queue.reset(this.#requestKey);
  };

  hostConnected(): void {
    // Sync current task on reconnect
    this.#task = this.#store.queue.tasks[this.#requestKey];

    this.#unsubscribe = this.#store.queue.subscribe((tasks) => {
      const newTask = tasks[this.#requestKey];
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
 * Reactive controller for optimistic updates.
 * Shows optimistic value while mutation is pending, actual value otherwise.
 *
 * @example
 * ```ts
 * class VolumeSlider extends LitElement {
 *   #volume = new OptimisticController(
 *     this,
 *     store,
 *     r => r.changeVolume,
 *     s => s.volume
 *   );
 *
 *   render() {
 *     const { value, setValue, isPending, isError } = this.#volume.value;
 *     return html`
 *       <input
 *         type="range"
 *         .value=${value}
 *         @input=${(e) => setValue(Number(e.target.value))}
 *         style="opacity: ${isPending ? 0.5 : 1}"
 *       />
 *       ${isError ? html`<span>Failed to change volume</span>` : ''}
 *     `;
 *   }
 * }
 * ```
 */
export class OptimisticController<
  S extends AnyStore,
  Value,
  RequestSelector extends (requests: InferStoreRequests<S>) => (value: Value) => any,
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #requestKey: string;
  readonly #request: ReturnType<RequestSelector>;
  readonly #stateSelector: (state: InferStoreState<S>) => Value;

  #optimistic: { value: Value; taskId: symbol } | null = null;
  #task: Task | undefined;
  #stateUnsubscribe: (() => void) | null = null;
  #queueUnsubscribe: (() => void) | null = null;

  constructor(
    host: ReactiveControllerHost,
    store: S,
    requestSelector: RequestSelector,
    stateSelector: (state: InferStoreState<S>) => Value,
  ) {
    this.#host = host;
    this.#store = store;
    this.#requestKey = extractRequestKey(store, requestSelector);
    this.#request = requestSelector(store.request as InferStoreRequests<S>) as ReturnType<RequestSelector>;
    this.#stateSelector = stateSelector;
    this.#task = store.queue.tasks[this.#requestKey];

    host.addController(this);
  }

  /**
   * Current optimistic result.
   */
  get value(): OptimisticResult<Value, (value: Value) => ReturnType<ReturnType<RequestSelector>>> {
    const task = this.#task;
    const isPending = task?.status === 'pending';
    const isError = task?.status === 'error';
    const error = isError ? task.error : undefined;

    // Use optimistic value if pending and we have one
    const actualValue = this.#stateSelector(this.#store.state);
    const value = isPending && this.#optimistic ? this.#optimistic.value : actualValue;

    return {
      value,
      setValue: this.#setValue,
      isPending,
      isError,
      error,
      reset: this.#reset,
    };
  }

  #setValue = (newValue: Value): ReturnType<ReturnType<RequestSelector>> => {
    // Store optimistic value with a placeholder task ID
    const pendingTaskId = Symbol('pending');
    this.#optimistic = { value: newValue, taskId: pendingTaskId };
    this.#host.requestUpdate();

    // Call the mutation
    const promise = this.#request(newValue);

    // After microtask, update taskId to match actual task
    queueMicrotask(() => {
      const currentTask = this.#store.queue.tasks[this.#requestKey];
      if (currentTask?.status === 'pending' && this.#optimistic?.taskId === pendingTaskId) {
        this.#optimistic = { value: newValue, taskId: currentTask.id };
      }
    });

    return promise;
  };

  #reset = (): void => {
    this.#optimistic = null;
    this.#store.queue.reset(this.#requestKey);
  };

  hostConnected(): void {
    // Sync current task on reconnect
    this.#task = this.#store.queue.tasks[this.#requestKey];

    // Subscribe to state changes
    this.#stateUnsubscribe = this.#store.subscribe(this.#stateSelector, () => {
      this.#host.requestUpdate();
    });

    // Subscribe to queue changes
    this.#queueUnsubscribe = this.#store.queue.subscribe((tasks) => {
      const newTask = tasks[this.#requestKey];
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
