import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { TasksRecord } from '../core/queue';
import type { AnyStore, InferStoreRequests, InferStoreState, InferStoreTasks } from '../core/store';

import { isUndefined } from '@videojs/utils/predicate';

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
