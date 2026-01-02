import type { Request, RequestMeta } from './request';
import { isFunction, isUndefined } from '@videojs/utils';
import { StoreError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey<T = string | symbol> = T & (string | symbol);

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
  [K in TaskKey]: Request<any, any>
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
export interface PendingTask<
  Key extends TaskKey = TaskKey,
  Input = unknown,
> {
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
export interface TaskContext<
  Input = unknown,
> {
  input: Input;
  signal: AbortSignal;
}

/**
 * Queued task waiting to execute.
 */
interface QueuedTask<
  Key extends TaskKey = TaskKey,
  Input = unknown,
  Output = unknown,
> {
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

/**
 * Queue configuration.
 */
export interface QueueConfig<Tasks extends TaskRecord = DefaultTaskRecord> {
  /** Default scheduler when task has no schedule */
  scheduler?: TaskScheduler;
  onDispatch?: <K extends keyof Tasks>(
    task: PendingTask<TaskKey<K>, Tasks[K]['input']>,
  ) => void;
  onSettled?: <K extends keyof Tasks>(
    task: PendingTask<TaskKey<K>, Tasks[K]['input']>,
    result: { status: 'success'; duration: number; result: Tasks[K]['output'] }
      | { status: 'cancelled'; error: unknown; duration: number }
      | { status: 'error'; error: unknown; duration: number },
  ) => void;
}

/**
 * Task to enqueue.
 */
export interface QueueTask<
  Key extends TaskKey = TaskKey,
  Input = unknown,
  Output = unknown,
> {
  name: string;
  key: Key;
  input?: Input;
  meta?: RequestMeta | null;
  schedule?: TaskScheduler | undefined;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

/**
 * Queued task info (public).
 */
export interface QueuedTaskInfo<Key extends TaskKey = TaskKey> {
  name: string;
  key: Key;
}

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

  readonly #queued = new Map<TaskKey, QueuedTask>();
  readonly #pending = new Map<TaskKey, PendingTask>();

  #destroyed = false;

  constructor(config: QueueConfig<Tasks> = {}) {
    this.#scheduler = config.scheduler ?? microtask;

    // Wrap callbacks to catch errors and prevent breaking queue/scheduler
    const safeCallback = <Args extends [PendingTask, ...unknown[]]>(callback: ((...args: Args) => unknown) | undefined) => {
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

  get queued(): ReadonlyMap<TaskKey<keyof Tasks>, QueuedTaskInfo<TaskKey<keyof Tasks>>> {
    const result = new Map<TaskKey, QueuedTaskInfo>();

    for (const [k, v] of this.#queued) {
      result.set(k, { name: v.name, key: v.key });
    }

    return result;
  }

  get pending(): ReadonlyMap<TaskKey<keyof Tasks>, PendingTask<TaskKey<keyof Tasks>>> {
    return new Map(this.#pending);
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  enqueue<K extends TaskKey<keyof Tasks>>(
    task: QueueTask<K, Tasks[K]['input'], Tasks[K]['output']>,
  ): Promise<Tasks[K]['output']> {
    const { name, key, input, schedule, meta = null, handler } = task;

    if (this.#destroyed) {
      return Promise.reject(new StoreError('Queue destroyed'));
    }

    // Cancel any queued task with same key
    const queued = this.#queued.get(key);
    queued?.invalidate?.();
    queued?.reject(new StoreError('Superseded'));
    this.#queued.delete(key);

    // Abort any pending task with same key
    this.#pending.get(key)?.abort.abort(new StoreError('Superseded'));

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

      this.#queued.set(key, task);

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
          this.#queued.delete(key);
        }
        reject(err);
      }
    });
  }

  dequeue<K extends TaskKey<keyof Tasks>>(key: K): boolean {
    const queued = this.#queued.get(key);
    if (!queued) return false;

    queued.invalidate?.();
    queued.reject(new StoreError('Dequeued'));
    this.#queued.delete(key);

    return true;
  }

  clear(): void {
    for (const queued of this.#queued.values()) {
      queued.invalidate?.();
      queued.reject(new StoreError('Cleared'));
    }

    this.#queued.clear();
  }

  flush(): Promise<void>;
  flush<K extends TaskKey<keyof Tasks>>(key: K): Promise<void>;
  async flush(key?: TaskKey): Promise<void> {
    if (!isUndefined(key)) {
      await this.#flushKey(key);
      return;
    }

    // Flush all
    const keys = [...this.#queued.keys()];
    await Promise.allSettled(keys.map(k => this.#flushKey(k)));
  }

  abort<K extends TaskKey<keyof Tasks>>(key: K, reason = 'Aborted'): void {
    // Reject queued
    const queued = this.#queued.get(key);
    queued?.invalidate?.();
    queued?.reject(new StoreError(reason));
    this.#queued.delete(key);

    // Abort pending with reason
    this.#pending.get(key)?.abort.abort(new StoreError(reason));
  }

  abortAll(reason = 'All requests aborted'): void {
    const error = new StoreError(reason);

    // Reject all queued
    for (const queued of this.#queued.values()) {
      queued.invalidate?.();
      queued.reject(error);
    }

    this.#queued.clear();

    // Abort all pending with reason
    for (const pending of this.#pending.values()) {
      pending.abort.abort(error);
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abortAll('Queue destroyed');
  }

  async #flushKey(key: TaskKey): Promise<void> {
    if (this.#destroyed) return;

    const task = this.#queued.get(key);
    if (!task) return;

    this.#queued.delete(key);

    await this.#executeNow(task);
  }

  async #executeNow(task: QueuedTask): Promise<void> {
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

    this.#pending.set(key, pending);
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
        result,
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
      // Only remove if we're still the pending task for this key
      if (this.#pending.get(key) === pending) {
        this.#pending.delete(key);
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
