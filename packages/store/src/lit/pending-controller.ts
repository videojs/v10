import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { PendingRecord, PendingTask, TaskKey, TaskRecord } from '../queue';
import type { AnySlice } from '../slice';
import type { InferStoreTasks, Store } from '../store';

/**
 * A reactive controller that tracks pending requests in the queue.
 *
 * Triggers host updates when the pending state changes.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   private pending = new PendingController(this, store);
 *
 *   render() {
 *     if (this.pending.has('seeking')) {
 *       ...
 *     }
 *
 *     return ...
 *   }
 * }
 * ```
 */
export class PendingController<
  Target,
  Slices extends AnySlice<Target>[],
  Tasks extends TaskRecord = InferStoreTasks<Slices>,
> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store<Target, Slices, Tasks>;

  #pending: PendingRecord<Tasks>;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: Store<Target, Slices, Tasks>) {
    this.#host = host;
    this.#store = store;
    this.#pending = store.queue.pending;

    host.addController(this);
  }

  /**
   * The current pending tasks record.
   */
  get value(): PendingRecord<Tasks> {
    return this.#pending;
  }

  /**
   * Whether any tasks are currently pending.
   */
  get any(): boolean {
    return Reflect.ownKeys(this.#pending).length > 0;
  }

  /**
   * The number of pending tasks.
   */
  get size(): number {
    return Reflect.ownKeys(this.#pending).length;
  }

  /**
   * The underlying store instance.
   */
  get store(): Store<Target, Slices, Tasks> {
    return this.#store;
  }

  /**
   * Check if a specific task key is pending.
   *
   * Note: The key is the task's `key` property, which may differ from
   * the request name if a custom key was specified in the request config.
   */
  has<K extends keyof Tasks>(key: K): boolean {
    return key in this.#pending;
  }

  /**
   * Get a specific pending task by key.
   *
   * Note: The key is the task's `key` property, which may differ from
   * the request name if a custom key was specified in the request config.
   */
  get<K extends keyof Tasks>(key: K): PendingTask<TaskKey<K>, Tasks[K]['input']> | undefined {
    return this.#pending[key];
  }

  hostConnected(): void {
    this.#unsubscribe = this.#store.queue.subscribe((pending) => {
      this.#pending = pending;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
