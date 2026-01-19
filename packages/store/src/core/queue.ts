import type { Request, RequestMeta } from './request';
import type { Reactive } from './state';
import type { ErrorTask, PendingTask, SuccessTask, Task, TaskContext, TaskKey } from './task';

import { isUndefined } from '@videojs/utils/predicate';

import { StoreError } from './errors';
import { reactive } from './state';

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

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
  /** Reactive tasks. Subscribe via `subscribe(queue.tasks, fn)`. */
  readonly tasks: Reactive<TasksRecord<Tasks>>;

  #destroyed = false;

  constructor() {
    this.tasks = reactive({} as TasksRecord<Tasks>);
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** Clear settled task(s). If name provided, clears that task. If no name, clears all settled. */
  reset(name?: keyof Tasks): void {
    if (!isUndefined(name)) {
      const task = this.tasks[name];
      if (!task || task.status === 'pending') return;

      delete this.tasks[name];
      return;
    }

    for (const key of Reflect.ownKeys(this.tasks) as (keyof Tasks)[]) {
      const task = this.tasks[key];
      if (task && task.status !== 'pending') {
        delete this.tasks[key];
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
    for (const task of Object.values(this.tasks) as Task[]) {
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
      const task = this.tasks[name];
      if (task?.status === 'pending') {
        task.abort.abort(new StoreError('ABORTED'));
      }

      return;
    }

    const error = new StoreError('ABORTED');

    for (const task of Object.values(this.tasks) as Task[]) {
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
    for (const key of Reflect.ownKeys(this.tasks) as (keyof Tasks)[]) {
      delete this.tasks[key];
    }
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
    (this.tasks as TasksRecord<Tasks>)[name as keyof Tasks] = pendingTask;

    try {
      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('ABORTED');
      }

      const result = await handler({ input, signal: abort.signal });

      if (abort.signal.aborted) {
        throw abort.signal.reason || new StoreError('ABORTED');
      }

      resolve(result);

      // Only update if we're still the current task for this name (compare by ID since reactive wraps tasks)
      const currentTask = this.tasks[name as keyof Tasks];
      if (currentTask?.id === id) {
        const successTask: SuccessTask = {
          ...pendingTask,
          status: 'success',
          settledAt: Date.now(),
          output: result,
        };
        (this.tasks as TasksRecord<Tasks>)[name as keyof Tasks] = successTask;
      }
    } catch (error) {
      reject(error);

      // Only update if we're still the current task for this name (compare by ID since reactive wraps tasks)
      const currentTask = this.tasks[name as keyof Tasks];
      if (currentTask?.id === id) {
        const errorTask: ErrorTask = {
          ...pendingTask,
          status: 'error',
          settledAt: Date.now(),
          error,
          cancelled: abort.signal.aborted,
        };
        (this.tasks as TasksRecord<Tasks>)[name as keyof Tasks] = errorTask;
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
 * - Subscribe to task changes via `subscribe(queue.tasks, fn)`
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
