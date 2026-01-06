import type { Request, RequestMeta } from './request';

import { tryCatch } from '@videojs/utils/function';
import { isFunction, isUndefined } from '@videojs/utils/predicate';

import { StoreError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey<T = string | symbol> = T & (string | symbol);

export type EnsureTaskKey<T> = T extends string | symbol ? T : never;

/**
 * Status for async operations (mutations, optimistic updates).
 *
 * Used by framework bindings (React, Lit) for tracking request lifecycle.
 */
export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * A task scheduler controls when a task flushes.
 *
 * Returns an optional cancel function.
 */
export type TaskScheduler = (flush: () => void) => (() => void) | void;

export type TaskRecord = {
  [K in TaskKey]: Request<any, any>;
};

export type DefaultTaskRecord = Record<TaskKey, Request<unknown, unknown>>;

export type EnsureTaskRecord<T> = T extends TaskRecord ? T : never;

export interface TaskBase<Key extends TaskKey = TaskKey, Input = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  startedAt: number;
  meta: RequestMeta | null;
}

export interface PendingTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'pending';
  abort: AbortController;
}

export interface SuccessTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> extends TaskBase<
  Key,
  Input
> {
  status: 'success';
  settledAt: number;
  output: Output;
}

export interface ErrorTask<Key extends TaskKey = TaskKey, Input = unknown> extends TaskBase<Key, Input> {
  status: 'error';
  settledAt: number;
  error: unknown;
  cancelled: boolean;
}

export type Task<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown>
  = | PendingTask<Key, Input>
    | SuccessTask<Key, Input, Output>
    | ErrorTask<Key, Input>;

export type SettledTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown>
  = | SuccessTask<Key, Input, Output>
    | ErrorTask<Key, Input>;

export interface TaskContext<Input = unknown> {
  input: Input;
  signal: AbortSignal;
}

export interface QueueTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  name: string;
  key: Key;
  input?: Input;
  meta?: RequestMeta | null;
  schedule?: TaskScheduler | undefined;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

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
  invalidate?: () => void;
}

export interface QueueConfig<Tasks extends TaskRecord = DefaultTaskRecord> {
  /** Default scheduler when task has no schedule */
  scheduler?: TaskScheduler;
  onDispatch?: <K extends keyof Tasks>(task: PendingTask<TaskKey<K>, Tasks[K]['input']>) => void;
  onSettled?: <K extends keyof Tasks>(task: SettledTask<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>) => void;
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

export type TasksRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: Task<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>;
};

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
    const logError = (e: unknown) => console.error('[vjs-queue]', e);
    this.#onDispatch = tryCatch(config.onDispatch, logError);
    this.#onSettled = tryCatch(config.onSettled, logError);
  }

  get queued(): Readonly<PublicQueuedRecord<Tasks>> {
    return Object.freeze({ ...this.#queued });
  }

  get tasks(): Readonly<TasksRecord<Tasks>> {
    return Object.freeze({ ...this.#tasks });
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  isPending(name: keyof Tasks): boolean {
    return this.#tasks[name]?.status === 'pending';
  }

  isQueued(name: keyof Tasks): boolean {
    // Note: #queued is keyed by key, but we need to search by name
    for (const task of Object.values(this.#queued)) {
      if (task?.name === name) return true;
    }
    return false;
  }

  isSettled(name: keyof Tasks): boolean {
    const task = this.#tasks[name];
    return task?.status === 'success' || task?.status === 'error';
  }

  /**
   * Clear settled task(s). If name provided, clears that task. If no name, clears all settled.
   */
  reset(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      const task = this.#tasks[name];
      if (!task || task.status === 'pending') return;

      delete this.#tasks[name];
      this.#notifySubscribers();

      return;
    }

    let cleared = false;
    for (const key of Reflect.ownKeys(this.#tasks)) {
      const task = this.#tasks[key];
      if (task && task.status !== 'pending') {
        delete this.#tasks[key];
        cleared = true;
      }
    }

    if (cleared) {
      this.#notifySubscribers();
    }
  }

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

    // Supersede any queued task with the same key
    const queued = this.#queued[key];
    queued?.invalidate?.();
    queued?.reject(new StoreError('SUPERSEDED'));
    delete this.#queued[key];

    // Supersede any pending task with the same key (may have different name)
    // Don't delete - let error handler update status to 'error' so controllers can see it
    for (const task of Object.values(this.#tasks)) {
      if (task?.key === key && task.status === 'pending') {
        task.abort.abort(new StoreError('SUPERSEDED'));
      }
    }

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

        const safeFlush = () => {
          if (flushed) return;
          flushed = true;
          this.#flushKey(key);
        };

        const cancel = scheduleFlush(safeFlush);

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

  /**
   * Cancel queued task(s). If name provided, cancels that task. If no name, cancels all.
   */
  cancel(name?: keyof Tasks): boolean {
    if (!isUndefined(name)) {
      // Find queued task by name (#queued is keyed by key)
      for (const [key, queued] of Object.entries(this.#queued)) {
        if (queued?.name === name) {
          queued.invalidate?.();
          queued.reject(new StoreError('REMOVED'));
          delete this.#queued[key as keyof Tasks];
          return true;
        }
      }
      return false;
    }

    const hadQueued = Object.keys(this.#queued).length > 0;
    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(new StoreError('REMOVED'));
    }

    this.#queued = {};

    return hadQueued;
  }

  async flush(name?: keyof Tasks): Promise<void> {
    if (!isUndefined(name)) {
      // Find queued task by name and flush by its key
      for (const [key, queued] of Object.entries(this.#queued)) {
        if (queued?.name === name) {
          await this.#flushKey(key as keyof Tasks);
          return;
        }
      }
      return;
    }

    const keys = Reflect.ownKeys(this.#queued);
    await Promise.allSettled(keys.map(k => this.#flushKey(k)));
  }

  /**
   * Abort task(s). If name provided, aborts that task. If no name, aborts all.
   */
  abort(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      // Find and abort queued task by name
      for (const [key, queued] of Object.entries(this.#queued)) {
        if (queued?.name === name) {
          queued.invalidate?.();
          queued.reject(new StoreError('ABORTED'));
          delete this.#queued[key as keyof Tasks];
          break;
        }
      }

      // Abort pending task (stored by name)
      const task = this.#tasks[name];
      if (task?.status === 'pending') {
        task.abort.abort(new StoreError('ABORTED'));
      }

      return;
    }

    const error = new StoreError('ABORTED');

    for (const queued of Object.values(this.#queued)) {
      queued.invalidate?.();
      queued.reject(error);
    }

    this.#queued = {};

    for (const task of Object.values(this.#tasks)) {
      if (task?.status === 'pending') {
        task.abort.abort(error);
      }
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abort();
    this.#subscribers.clear();
    this.#tasks = {};
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

    // Store tasks by name for controller access (different names can share same key)
    this.#tasks[name as keyof Tasks] = pendingTask;
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

      const successTask: SuccessTask = {
        ...pendingTask,
        status: 'success',
        settledAt: Date.now(),
        output: result,
      };

      // Only update if we're still the current task for this name
      if (this.#tasks[name as keyof Tasks] === pendingTask) {
        this.#tasks[name as keyof Tasks] = successTask;
        this.#notifySubscribers();
      }

      this.#onSettled?.(successTask);
    } catch (error) {
      reject(error);

      const errorTask: ErrorTask = {
        ...pendingTask,
        status: 'error',
        settledAt: Date.now(),
        error,
        cancelled: abort.signal.aborted,
      };

      // Only update if we're still the current task for this name
      if (this.#tasks[name as keyof Tasks] === pendingTask) {
        this.#tasks[name as keyof Tasks] = errorTask;
        this.#notifySubscribers();
      }

      this.#onSettled?.(errorTask);
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
