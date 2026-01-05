import type { Request, RequestMeta } from './request';

import { isFunction, isUndefined } from '@videojs/utils/predicate';

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
 * Base fields shared by all task states.
 */
export interface TaskBase<Key extends TaskKey = TaskKey, Input = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  startedAt: number;
  meta: RequestMeta | null;
}

/**
 * Pending task - request in flight.
 */
export interface PendingTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'pending';
  abort: AbortController;
}

/**
 * Success task - completed successfully.
 */
export interface SuccessTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> extends TaskBase<
  Key,
  Input
> {
  status: 'success';
  settledAt: number;
  duration: number;
  output: Output;
}

/**
 * Error task - failed or cancelled.
 */
export interface ErrorTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'error';
  settledAt: number;
  duration: number;
  error: unknown;
  cancelled: boolean;
}

/**
 * Task with status discriminator.
 */
export type Task<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown>
  = | PendingTask<Key, Input>
    | SuccessTask<Key, Input, Output>
    | ErrorTask<Key, Input>;

/**
 * Settled task (success or error).
 */
export type SettledTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown>
  = | SuccessTask<Key, Input, Output>
    | ErrorTask<Key, Input>;

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

/**
 * Map of task key -> task (pending, success, or error).
 */
export type TasksRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: Task<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>;
};

/**
 * Listener callback for task state changes.
 *
 * Called when tasks are dispatched, settled, or reset.
 */
export type QueueListener<Tasks extends TaskRecord> = (tasks: TasksRecord<Tasks>) => void;

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
  #tasks: TasksRecord<Tasks> = {};
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

  /**
   * Map of task key -> task (pending, success, or error).
   */
  get tasks(): Readonly<TasksRecord<Tasks>> {
    return Object.freeze({ ...this.#tasks });
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /**
   * Check if a task with the given key is currently pending (executing).
   */
  isPending(key: keyof Tasks): boolean {
    return this.#tasks[key]?.status === 'pending';
  }

  /**
   * Check if a task with the given key is currently queued (waiting to execute).
   */
  isQueued(key: keyof Tasks): boolean {
    return key in this.#queued;
  }

  /**
   * Clear settled task for a key.
   *
   * No-op if task is pending or doesn't exist.
   *
   * @param key - Task key to reset
   */
  reset(key: keyof Tasks): void {
    const task = this.#tasks[key];
    if (!task || task.status === 'pending') return;

    delete this.#tasks[key];
    this.#notifySubscribers();
  }

  /**
   * Subscribe to task state changes.
   *
   * Fires when tasks are dispatched, settled, or reset.
   *
   * @param listener - Callback receiving the current tasks map
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

    const snapshot = this.tasks;
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
      return Promise.reject(new StoreError('DESTROYED'));
    }

    // Cancel any queued task with same key
    const queued = this.#queued[key];
    queued?.invalidate?.();
    queued?.reject(new StoreError('SUPERSEDED'));
    delete this.#queued[key];

    // Abort any pending task with same key
    const existing = this.#tasks[key];
    if (existing?.status === 'pending') {
      existing.abort.abort(new StoreError('SUPERSEDED'));
    }

    // Clear any settled task for this key (new request replaces it)
    delete this.#tasks[key];

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
    queued.reject(new StoreError('REMOVED'));
    delete this.#queued[key];

    return true;
  }

  clear(): void {
    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(new StoreError('REMOVED'));
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

  abort<K extends keyof Tasks>(key: K): void {
    // Reject queued
    const queued = this.#queued[key];
    queued?.invalidate?.();
    queued?.reject(new StoreError('ABORTED'));
    delete this.#queued[key];

    // Abort pending task
    const task = this.#tasks[key];
    if (task?.status === 'pending') {
      task.abort.abort(new StoreError('ABORTED'));
    }
  }

  abortAll(): void {
    const error = new StoreError('ABORTED');

    // Reject all queued
    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(error);
    }

    this.#queued = {};

    // Abort all pending tasks
    for (const task of Object.values(this.#tasks)) {
      if (task?.status === 'pending') {
        task.abort.abort(error);
      }
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abortAll();
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

    const pendingTask: PendingTask = {
      status: 'pending',
      id,
      name,
      key,
      input,
      startedAt,
      abort,
      meta,
    };

    this.#tasks[key as keyof Tasks] = pendingTask;
    this.#notifySubscribers();
    this.#onDispatch?.(pendingTask);

    try {
      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('ABORTED');
      }

      const result = await handler({ input, signal: abort.signal });

      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('ABORTED');
      }

      resolve(result);

      const settledAt = Date.now();
      const successTask: SuccessTask = {
        status: 'success',
        id,
        name,
        key,
        input,
        startedAt,
        meta,
        settledAt,
        duration: settledAt - startedAt,
        output: result,
      };

      // Only update if we're still the current task for this key
      if (this.#tasks[key as keyof Tasks] === pendingTask) {
        this.#tasks[key as keyof Tasks] = successTask;
        this.#notifySubscribers();
      }

      this.#onSettled?.(pendingTask, {
        status: 'success',
        duration: successTask.duration,
        output: result,
      });
    } catch (error) {
      reject(error);

      const cancelled = abort.signal.aborted;
      const settledAt = Date.now();
      const errorTask: ErrorTask = {
        status: 'error',
        id,
        name,
        key,
        input,
        startedAt,
        meta,
        settledAt,
        duration: settledAt - startedAt,
        error,
        cancelled,
      };

      // Only update if we're still the current task for this key
      if (this.#tasks[key as keyof Tasks] === pendingTask) {
        this.#tasks[key as keyof Tasks] = errorTask;
        this.#notifySubscribers();
      }

      this.#onSettled?.(pendingTask, {
        status: cancelled ? 'cancelled' : 'error',
        duration: errorTask.duration,
        error,
      });
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
