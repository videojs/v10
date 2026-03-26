import { anyAbortSignal } from '@videojs/utils/events';
import { generateId } from './utils/generate-id';

// =============================================================================
// DeepReadonly
// =============================================================================

/** Recursively marks all properties as readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// =============================================================================
// Task
// =============================================================================

export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

/**
 * Configuration for a Task.
 */
export interface TaskConfig {
  /**
   * Identifier for this task.
   * - string: used as-is
   * - () => string: called once at construction time
   * - undefined: a unique ID is generated via generateId()
   */
  id?: string | (() => string);

  /**
   * Optional external AbortSignal to compose with the task's internal one.
   * The task's work is aborted when either the internal controller (via abort())
   * or this external signal fires — whichever comes first.
   */
  signal?: AbortSignal;
}

/**
 * Minimal contract for a schedulable unit of async work.
 */
export interface TaskLike<TValue = void, TError = unknown> {
  readonly id: string;
  readonly status: TaskStatus;
  readonly value: DeepReadonly<TValue> | undefined;
  readonly error: DeepReadonly<TError> | undefined;
  run(): Promise<TValue>;
  abort(): void;
}

/**
 * Generic reusable task that wraps an async run function.
 *
 * Owns its own AbortController so it can always be aborted independently.
 * Optionally composes an external AbortSignal so that a parent's cancellation
 * propagates into the task's work without requiring the caller to track the
 * task separately.
 *
 * Ordering guarantee: `value` is written before `status` transitions to `'done'`;
 * `error` is written before `status` transitions to `'error'`. Any reader
 * observing `status === 'done'` is guaranteed `value` is already present.
 */
export class Task<TValue = void, TError = unknown> implements TaskLike<TValue, TError> {
  readonly id: string;
  readonly #runFn: (signal: AbortSignal) => Promise<TValue>;
  readonly #abortController = new AbortController();
  readonly #signal: AbortSignal;

  #status: TaskStatus = 'pending';
  #value: TValue | undefined = undefined;
  #error: TError | undefined = undefined;

  constructor(runFn: (signal: AbortSignal) => Promise<TValue>, config?: TaskConfig) {
    this.#runFn = runFn;
    const rawId = config?.id;
    this.id = typeof rawId === 'function' ? rawId() : (rawId ?? generateId());
    this.#signal = config?.signal
      ? anyAbortSignal([this.#abortController.signal, config.signal])
      : this.#abortController.signal;
  }

  get status(): TaskStatus {
    return this.#status;
  }

  get value(): DeepReadonly<TValue> | undefined {
    return this.#value as DeepReadonly<TValue> | undefined;
  }

  get error(): DeepReadonly<TError> | undefined {
    return this.#error as DeepReadonly<TError> | undefined;
  }

  async run(): Promise<TValue> {
    this.#status = 'running';
    try {
      const result = await this.#runFn(this.#signal);
      this.#value = result; // value before status — ordering guarantee
      this.#status = 'done';
      return result;
    } catch (e) {
      this.#error = e as TError; // error before status — ordering guarantee
      this.#status = 'error';
      throw e;
    }
  }

  abort(): void {
    this.#abortController.abort();
  }
}

// =============================================================================
// ConcurrentRunner
// =============================================================================

/**
 * Runs tasks concurrently, deduplicated by task id.
 *
 * If a task with a given id is already in flight, subsequent schedule() calls
 * for that id are silently ignored until the first completes. Tasks are stored
 * so abortAll() can cancel any in-flight work (e.g. on engine cleanup).
 */
export class ConcurrentRunner {
  readonly #pending = new Map<string, TaskLike<unknown, unknown>>();

  schedule<TValue = void, TError = unknown>(task: TaskLike<TValue, TError>): void {
    if (this.#pending.has(task.id)) return;

    this.#pending.set(task.id, task as TaskLike<unknown, unknown>);
    task
      .run()
      .catch((error) => {
        if (!(error instanceof Error && error.name === 'AbortError')) throw error;
      })
      .finally(() => {
        this.#pending.delete(task.id);
      });
  }

  abortAll(): void {
    for (const task of this.#pending.values()) task.abort();
    this.#pending.clear();
  }
}

// =============================================================================
// SerialRunner
// =============================================================================

/**
 * Runs tasks one at a time in submission order.
 *
 * Each schedule() call returns a Promise that resolves or rejects with the
 * task's result when it is eventually executed. Tasks wait in queue until the
 * prior task completes.
 *
 * Serialization is achieved by chaining each task's run() onto the tail of a
 * shared promise chain — no explicit queue or drain loop needed.
 *
 * abortAll() aborts all pending (not yet started) tasks and the currently
 * in-flight task. Pending tasks still run briefly but receive an aborted
 * signal and are expected to exit early.
 */
export class SerialRunner {
  #chain: Promise<unknown> = Promise.resolve();
  readonly #pending = new Set<TaskLike<unknown, unknown>>();
  #current: TaskLike<unknown, unknown> | null = null;

  schedule<TValue = void, TError = unknown>(task: TaskLike<TValue, TError>): Promise<TValue> {
    const t = task as TaskLike<unknown, unknown>;
    this.#pending.add(t);

    const result = this.#chain
      .then(() => {
        this.#pending.delete(t);
        this.#current = t;
        return task.run();
      })
      .finally(() => {
        this.#current = null;
      });

    // Advance the chain regardless of whether this task succeeds or fails.
    this.#chain = result.then(
      () => {},
      () => {}
    );

    return result as Promise<TValue>;
  }

  abortAll(): void {
    for (const task of this.#pending) task.abort();
    this.#pending.clear();
    this.#current?.abort();
  }

  destroy(): void {
    this.abortAll();
  }
}
