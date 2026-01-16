import type { Request, RequestMeta } from './request';
import type { ErrorTask, PendingTask, SuccessTask, Task, TaskContext, TaskKey } from './task';

import { isUndefined } from '@videojs/utils/predicate';

import { StoreError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskRecord = {
  [K in TaskKey]: Request<any, any>;
};

export type DefaultTaskRecord = Record<TaskKey, Request<unknown, unknown>>;

export type EnsureTaskRecord<T> = T extends TaskRecord ? T : never;

export interface QueueTask<Key extends TaskKey = TaskKey, Input = unknown, Output = unknown> {
  name: string;
  key: Key;
  input?: Input;
  meta?: RequestMeta | null;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

export type TasksRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: Task<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>;
};

export type QueueListener<Tasks extends TaskRecord> = (tasks: TasksRecord<Tasks>) => void;

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
  readonly #subscribers = new Set<QueueListener<Tasks>>();

  #tasks: TasksRecord<Tasks> = {};
  #destroyed = false;

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

    // Supersede any pending task with the same key (may have different name)
    // Don't delete - let error handler update status to 'error' so controllers can see it
    for (const task of Object.values(this.#tasks)) {
      if (task?.key === key && task.status === 'pending') {
        task.abort.abort(new StoreError('SUPERSEDED'));
      }
    }

    return new Promise<Tasks[K]['output']>((resolve, reject) => {
      this.#executeNow({
        id: Symbol('@videojs/task'),
        name,
        key,
        input,
        meta,
        handler,
        resolve,
        reject,
      });
    });
  }

  /** Abort task(s). If name provided, aborts that task. If no name, aborts all. */
  abort(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      const task = this.#tasks[name];
      if (task?.status === 'pending') {
        task.abort.abort(new StoreError('ABORTED'));
      }

      return;
    }

    const error = new StoreError('ABORTED');

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

  async #executeNow<K extends keyof Tasks>(params: {
    id: symbol;
    name: string;
    key: TaskKey<K>;
    input: Tasks[K]['input'];
    meta: RequestMeta | null;
    handler: (ctx: TaskContext<Tasks[K]['input']>) => Promise<Tasks[K]['output']>;
    resolve: (value: Tasks[K]['output']) => void;
    reject: (error: unknown) => void;
  }): Promise<void> {
    const { id, name, key, input, meta, handler, resolve, reject } = params;

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
 * - Tasks execute immediately when enqueued
 * - Same key = supersede previous (abort pending)
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
