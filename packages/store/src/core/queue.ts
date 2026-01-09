import type { Request, RequestMeta } from './request';

import { isUndefined } from '@videojs/utils/predicate';

import { StoreError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey<T = string | symbol> = T & (string | symbol);

export type EnsureTaskKey<T> = T extends string | symbol ? T : never;

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

// ----------------------------------------
// Type Guards
// ----------------------------------------

/** Check if task is pending (in-flight). */
export function isPendingTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is PendingTask<K, I> {
  return task?.status === 'pending';
}

/** Check if task is settled (success or error). */
export function isSettledTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is SettledTask<K, I, O> {
  return task?.status === 'success' || task?.status === 'error';
}

/** Check if task is a success. */
export function isSuccessTask<K extends TaskKey, I, O>(task: Task<K, I, O> | undefined): task is SuccessTask<K, I, O> {
  return task?.status === 'success';
}

/** Check if task is an error. */
export function isErrorTask<K extends TaskKey, I>(task: Task<K, I> | undefined): task is ErrorTask<K, I> {
  return task?.status === 'error';
}

export interface TaskContext<Input = unknown> {
  input: Input;
  signal: AbortSignal;
}

export interface QueueTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  name: string;
  key: Key;
  input?: Input;
  meta?: RequestMeta | null;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

interface QueuedTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  meta: RequestMeta | null;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
  resolve: (value: Output) => void;
  reject: (error: unknown) => void;
}

type QueuedRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: QueuedTask<TaskKey<K>>;
};

export type TasksRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: Task<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>;
};

export type QueueListener<Tasks extends TaskRecord> = (tasks: TasksRecord<Tasks>) => void;

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
  readonly #subscribers = new Set<QueueListener<Tasks>>();

  #queued: QueuedRecord<Tasks> = {};
  #tasks: TasksRecord<Tasks> = {};
  #destroyed = false;
  #flushScheduled = false;

  get tasks(): Readonly<TasksRecord<Tasks>> {
    return Object.freeze({ ...this.#tasks });
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** Clear settled task(s). If name provided, clears that task. If no name, clears all settled. */
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
    const { name, key, input, meta = null, handler } = task;

    if (this.#destroyed) {
      return Promise.reject(new StoreError('DESTROYED'));
    }

    // Supersede any queued task with the same key
    const queued = this.#queued[key];
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
      const queuedTask: QueuedTask = {
        id: Symbol('@videojs/task'),
        name,
        key,
        input,
        meta,
        handler,
        resolve,
        reject,
      };

      this.#queued[key as keyof Tasks] = queuedTask;
      this.#scheduleFlush();
    });
  }

  #scheduleFlush(): void {
    if (this.#flushScheduled) return;

    this.#flushScheduled = true;
    queueMicrotask(() => {
      this.#flushScheduled = false;
      this.#flushAll();
    });
  }

  #flushAll(): void {
    if (this.#destroyed) return;

    const keys = Reflect.ownKeys(this.#queued) as (keyof Tasks)[];
    for (const key of keys) {
      const task = this.#queued[key];
      if (task) {
        delete this.#queued[key];
        this.#executeNow(task);
      }
    }
  }

  /** Abort task(s). If name provided, aborts that task. If no name, aborts all. */
  abort(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      // Find and abort queued task by name
      for (const [key, queued] of Object.entries(this.#queued)) {
        if (queued?.name === name) {
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
 * - Tasks batched via microtask for supersession
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
export function createQueue<Tasks extends TaskRecord = DefaultTaskRecord>(): Queue<Tasks> {
  return new Queue<Tasks>();
}
