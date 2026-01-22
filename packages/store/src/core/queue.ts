import type { Request, RequestMeta, RequestMode } from './request';
import type { State, WritableState } from './state';
import type { ErrorTask, PendingTask, SuccessTask, Task, TaskContext, TaskKey } from './task';

import { abortable } from '@videojs/utils/events';
import { isUndefined } from '@videojs/utils/predicate';

import { StoreError } from './errors';
import { createState } from './state';

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
  mode?: RequestMode;
  input?: Input;
  meta?: RequestMeta | null;
  handler: (ctx: TaskContext<Input>) => Promise<Output>;
}

export type TasksRecord<Tasks extends TaskRecord> = {
  [K in keyof Tasks]?: Task<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>;
};

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
  readonly #tasks: WritableState<TasksRecord<Tasks>>;
  readonly #sharedPromises = new Map<TaskKey, Promise<unknown>>();

  #destroyed = false;

  get tasks(): State<TasksRecord<Tasks>> {
    return this.#tasks;
  }

  constructor() {
    this.#tasks = createState({});
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** Clear settled task(s). If name provided, clears that task. If no name, clears all settled. */
  reset(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      const task = this.tasks.current[name];
      if (!task || task.status === 'pending') return;

      this.#tasks.delete(name);

      return;
    }

    for (const key of Reflect.ownKeys(this.tasks.current) as (keyof Tasks)[]) {
      const task = this.tasks.current[key];

      if (task && task.status !== 'pending') {
        this.#tasks.delete(key);
      }
    }
  }

  enqueue<K extends keyof Tasks>(
    task: QueueTask<TaskKey<K>, Tasks[K]['input'], Tasks[K]['output']>,
  ): Promise<Tasks[K]['output']> {
    const { name, key, mode = 'exclusive', input, meta = null, handler } = task;

    if (this.#destroyed) {
      return Promise.reject(new StoreError('DESTROYED'));
    }

    // Shared mode: join existing pending task with same key
    if (mode === 'shared') {
      const existingPromise = this.#sharedPromises.get(key);
      if (existingPromise) {
        return existingPromise;
      }
    }

    // Supersede any pending task with the same key (may have different name)
    for (const existingTask of Object.values(this.tasks.current)) {
      if (existingTask?.key === key && existingTask.status === 'pending') {
        existingTask.abort.abort(new StoreError('SUPERSEDED'));
      }
    }

    const promise = new Promise<Tasks[K]['output']>((resolve, reject) => {
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

    // Track promise for shared mode
    if (mode === 'shared') {
      this.#sharedPromises.set(key, promise);
      // Use .then() to avoid unhandled rejection from .finally() propagating errors
      promise.then(
        () => this.#sharedPromises.delete(key),
        () => this.#sharedPromises.delete(key),
      );
    }

    return promise;
  }

  /** Abort task(s). If name provided, aborts that task. If no name, aborts all. */
  abort(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      const task = this.tasks.current[name];
      if (task?.status === 'pending') {
        task.abort.abort(new StoreError('ABORTED'));
      }

      return;
    }

    const error = new StoreError('ABORTED');

    for (const task of Object.values(this.tasks.current)) {
      if (task?.status === 'pending') {
        task.abort.abort(error);
      }
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abort();

    // Clear all tasks
    for (const key of Reflect.ownKeys(this.tasks.current)) {
      this.#tasks.delete(key);
    }

    this.#sharedPromises.clear();
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

    // Store tasks by name for controller access
    this.#tasks.set(name as keyof Tasks, pendingTask);

    try {
      const result = await abortable(handler({ input, signal: abort.signal }), abort.signal);

      resolve(result);

      // Only update if we're still the current task for this name
      const currentTask = this.tasks.current[name];

      if (currentTask?.id === id) {
        this.#tasks.set(
          name as keyof Tasks,
          {
            ...currentTask,
            status: 'success',
            settledAt: Date.now(),
            output: result,
          } satisfies SuccessTask,
        );
      }
    } catch (error) {
      reject(error);

      // Only update if we're still the current task for this name
      const currentTask = this.tasks.current[name as keyof Tasks];

      if (currentTask?.id === id) {
        this.#tasks.set(
          name as keyof Tasks,
          {
            ...currentTask,
            status: 'error',
            settledAt: Date.now(),
            error,
            cancelled: abort.signal.aborted,
          } satisfies ErrorTask,
        );
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
