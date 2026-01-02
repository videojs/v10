import type { Request, RequestMeta } from './request';

import { isFunction, isUndefined } from '@videojs/utils';

import { StoreError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey<T = string | symbol> = T & (string | symbol);

export type EnsureTaskKey<T> = T extends string | symbol ? T : never;

/**
 * A task scheduler controls when a task flushes.
 *
 * Returns an optional cancel function.
 */
export type TaskScheduler = (flush: () => void) => (() => void) | void;

/**
 * Map of task key -> input/output types.
 */
export type TaskRecord = {
  [K in TaskKey]: Request<any, any>;
};

/**
 * Default loose task types.
 */
export type DefaultTaskRecord = Record<TaskKey, Request<unknown, unknown>>;

/**
 * Ensure T is a TaskRecord.
 */
export type EnsureTaskRecord<T> = T extends TaskRecord ? T : never;

/**
 * Pending task info.
 */
export interface PendingTask<Key extends TaskKey = TaskKey, Input = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  startedAt: number;
  abort: AbortController;
  meta: RequestMeta | null;
}

/**
 * Context passed to task handler.
 */
export interface TaskContext<Input = unknown> {
  input: Input;
  signal: AbortSignal;
}

/**
 * Task to enqueue.
 */
export interface QueueTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  name: string;
  key: Key;
  input?: Input;
  meta?: RequestMeta | null;
  schedule?: TaskScheduler | undefined;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

/**
 * Queued task waiting to execute.
 */
interface QueuedTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  meta: RequestMeta | null;
  schedule: TaskScheduler | undefined;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
  resolve: (value: Output) => void;
  reject: (error: unknown) => void;
  /* Cancel scheduled execution. */
  invalidate?: () => void;
}

export interface QueueConfig<Tasks extends TaskRecord = DefaultTaskRecord> {
  /** Default scheduler when task has no schedule */
  scheduler?: TaskScheduler;
  onDispatch?: <K extends keyof Tasks>(task: PendingTask<TaskKey<K>, Tasks[K]['input']>) => void;
  onSettled?: <K extends keyof Tasks>(
    task: PendingTask<TaskKey<K>, Tasks[K]['input']>,
    result:
      | { status: 'success'; duration: number; output: Tasks[K]['output'] }
      | { status: 'cancelled'; error: unknown; duration: number }
      | { status: 'error'; error: unknown; duration: number },
  ) => void;
}

export interface QueuedTaskId<Key extends TaskKey = TaskKey> {
  key: Key;
  name: string;
}

export type PublicQueuedRecord<Tasks extends TaskRecord> = {
  readonly [K in keyof Tasks]?: QueuedTaskId<TaskKey<K>>;
};

export type QueuedRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: QueuedTask<TaskKey<K>>;
};

export type PendingRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: PendingTask<TaskKey<K>, Tasks[K]['input']>;
};

/**
 * Listener callback for pending state changes.
 *
 * Called when tasks are dispatched or settled.
 */
export type QueueListener<Tasks extends TaskRecord> = (pending: PendingRecord<Tasks>) => void;

// ----------------------------------------
// Schedulers
// ----------------------------------------

/**
 * Default scheduler, delay to next microtask.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide}
 */
export const microtask: TaskScheduler = (flush) => {
  let cancelled = false;

  queueMicrotask(() => {
    if (!cancelled) flush();
  });

  return () => {
    cancelled = true;
  };
};

/**
 * Delay execution by ms. Resets on each new task.
 *
 * @param ms - Milliseconds to delay
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout}
 */
export function delay(ms: number): TaskScheduler {
  return (flush) => {
    const id = setTimeout(flush, ms);
    return () => clearTimeout(id);
  };
}

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
  readonly #scheduler: TaskScheduler;
  readonly #onDispatch: QueueConfig<Tasks>['onDispatch'];
  readonly #onSettled: QueueConfig<Tasks>['onSettled'];
  readonly #subscribers = new Set<QueueListener<Tasks>>();

  #queued: QueuedRecord<Tasks> = {};
  #pending: PendingRecord<Tasks> = {};
  #destroyed = false;

  constructor(config: QueueConfig<Tasks> = {}) {
    this.#scheduler = config.scheduler ?? microtask;

    // Wrap callbacks to catch errors and prevent breaking queue/scheduler
    const safeCallback = <Args extends [PendingTask, ...unknown[]]>(
      callback: ((...args: Args) => unknown) | undefined,
    ) => {
      if (!callback) return undefined;
      return (...args: Args) => {
        try {
          callback(...args);
        } catch (e) {
          console.error('[vjs-queue]', e);
        }
      };
    };

    this.#onDispatch = safeCallback(config.onDispatch);
    this.#onSettled = safeCallback(config.onSettled);
  }

  get queued(): Readonly<PublicQueuedRecord<Tasks>> {
    return Object.freeze({ ...this.#queued });
  }

  get pending(): Readonly<PendingRecord<Tasks>> {
    return Object.freeze({ ...this.#pending });
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /**
   * Check if a task with the given key is currently pending (executing).
   */
  isPending(key: keyof Tasks): boolean {
    return key in this.#pending;
  }

  /**
   * Check if a task with the given key is currently queued (waiting to execute).
   */
  isQueued(key: keyof Tasks): boolean {
    return key in this.#queued;
  }

  /**
   * Subscribe to pending state changes.
   *
   * Fires when tasks are dispatched or settled.
   *
   * @param listener - Callback receiving the current pending map
   * @returns Unsubscribe function
   */
  subscribe(listener: QueueListener<Tasks>): () => void {
    this.#subscribers.add(listener);
    return () => {
      this.#subscribers.delete(listener);
    };
  }

  #notifySubscribers(): void {
    if (this.#subscribers.size === 0) return;

    const snapshot = this.pending;
    for (const listener of this.#subscribers) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[vjs-queue]', e);
      }
    }
  }

  enqueue<K extends keyof Tasks>(
    task: QueueTask<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>,
  ): Promise<Tasks[K]['output']> {
    const { name, key, input, schedule, meta = null, handler } = task;

    if (this.#destroyed) {
      return Promise.reject(new StoreError('Queue destroyed'));
    }

    // Cancel any queued task with same key
    const queued = this.#queued[key];
    queued?.invalidate?.();
    queued?.reject(new StoreError('Superseded'));
    delete this.#queued[key];

    // Abort any pending task with same key
    this.#pending[key]?.abort.abort(new StoreError('Superseded'));

    return new Promise<Tasks[K]['output']>((resolve, reject) => {
      const task: QueuedTask = {
        id: Symbol('@videojs/task'),
        name,
        key,
        input,
        meta,
        schedule,
        handler,
        resolve,
        reject,
      };

      this.#queued[key as keyof Tasks] = task;

      let flushed = false;

      try {
        const scheduleFlush = schedule ?? this.#scheduler;

        // Guard against multiple flushes
        const safeFlush = () => {
          if (flushed) return;
          flushed = true;
          this.#flushKey(key);
        };

        const cancel = scheduleFlush(safeFlush);

        // Only set invalidate if we haven't already flushed
        if (!flushed && isFunction(cancel)) {
          task.invalidate = cancel;
        }
      } catch (err) {
        if (!flushed) {
          delete this.#queued[key];
        }

        reject(err);
      }
    });
  }

  dequeue<K extends keyof Tasks>(key: K): boolean {
    const queued = this.#queued[key];
    if (!queued) return false;

    queued.invalidate?.();
    queued.reject(new StoreError('Dequeued'));
    delete this.#queued[key];

    return true;
  }

  clear(): void {
    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(new StoreError('Cleared'));
    }

    this.#queued = {};
  }

  async flush(key?: keyof Tasks): Promise<void> {
    if (!isUndefined(key)) {
      await this.#flushKey(key);
      return;
    }

    // Flush all
    const keys = Reflect.ownKeys(this.#queued);
    await Promise.allSettled(keys.map(k => this.#flushKey(k)));
  }

  abort<K extends keyof Tasks>(key: K, reason = 'Aborted'): void {
    // Reject queued
    const queued = this.#queued[key];
    queued?.invalidate?.();
    queued?.reject(new StoreError(reason));
    delete this.#queued[key];

    // Abort pending with reason
    this.#pending[key]?.abort.abort(new StoreError(reason));
  }

  abortAll(reason = 'All requests aborted'): void {
    const error = new StoreError(reason);

    // Reject all queued
    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(error);
    }

    this.#queued = {};

    // Abort all pending with reason
    for (const pending of Object.values(this.#pending)) {
      pending.abort.abort(error);
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abortAll('Queue destroyed');
    this.#subscribers.clear();
  }

  async #flushKey(key: keyof Tasks): Promise<void> {
    if (this.#destroyed) return;

    const task = this.#queued[key];
    if (!task) return;

    delete this.#queued[key];

    await this.#executeNow(task);
  }

  async #executeNow<K extends keyof Tasks>(
    task: QueuedTask<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>,
  ): Promise<void> {
    const { id, name, key, input, meta, handler, resolve, reject } = task;

    const abort = new AbortController();
    const startedAt = Date.now();

    const pending: PendingTask = {
      id,
      name,
      key,
      input,
      startedAt,
      abort,
      meta,
    };

    this.#pending[key as keyof Tasks] = pending;
    this.#notifySubscribers();
    this.#onDispatch?.(pending);

    try {
      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('Aborted');
      }

      const result = await handler({ input, signal: abort.signal });

      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('Aborted');
      }

      resolve(result);

      this.#onSettled?.(pending, {
        status: 'success',
        duration: Date.now() - startedAt,
        output: result,
      });
    } catch (error) {
      reject(error);

      const cancelled = abort.signal.aborted;

      this.#onSettled?.(pending, {
        status: cancelled ? 'cancelled' : 'error',
        duration: Date.now() - startedAt,
        error,
      });
    } finally {
      const currentPending = this.#pending[key as keyof Tasks];
      // Only remove if we're still the pending task for this key
      if (currentPending === pending) {
        delete this.#pending[key];
        this.#notifySubscribers();
      }
    }
  }
}

// ----------------------------------------
// Factory
// ----------------------------------------

/**
 * Create a queue for managing task execution.
 *
 * - Same key = supersede previous (cancel queued, abort pending)
 * - Tasks scheduled via schedule function (default: microtask)
 *
 * @example
 * // Loose typing (default)
 * const queue = createQueue();
 *
 * @example
 * // Strongly typed keys
 * const queue = createQueue<{
 *   'playback': Request;
 *   'volume': Request<number>;
 * }>();
 */
export function createQueue<Tasks extends TaskRecord = DefaultTaskRecord>(
  config: QueueConfig<Tasks> = {},
): Queue<Tasks> {
  return new Queue<Tasks>(config);
}
