import { isFunction, isUndefined } from '@videojs/utils';
import { RequestCancelledError, RequestSupersededError } from './errors';

// ----------------------------------------
// Types
// ----------------------------------------

export type QueueKey<T = string | symbol> = T & (string | symbol);

/**
 * A schedule function controls when a request flushes.
 *
 * Returns an optional cancel function.
 */
export type Schedule = (flush: () => void) => (() => void) | void;

/**
 * Map of task key -> input/output types.
 */
export type TaskTypes = {
  [K in QueueKey]: {
    input: unknown;
    output: unknown;
  };
};

/**
 * Default loose task types.
 */
export type DefaultTaskTypes = Record<QueueKey, { input: unknown; output: unknown }>;

/**
 * Pending request info.
 */
export interface PendingRequest<
  Key extends QueueKey = QueueKey,
  Input = unknown,
> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  epoch: number;
  startedAt: number;
  abort: AbortController;
}

/**
 * Queued request waiting to execute.
 */
interface QueuedRequest<
  Key extends QueueKey = QueueKey,
  Input = unknown,
  Output = unknown,
> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  epoch: number;
  schedule: Schedule | undefined;
  handler: (ctx: { signal: AbortSignal }) => Promise<Output>;
  resolve: (value: Output) => void;
  reject: (error: unknown) => void;
  /* Cancel scheduled execution. */
  invalidate?: () => void;
}

/**
 * Queue configuration.
 */
export interface QueueConfig<Tasks extends TaskTypes = DefaultTaskTypes> {
  /** Default scheduler when request has no schedule */
  scheduler?: Schedule;
  onDispatch?: <K extends keyof Tasks>(
    request: PendingRequest<QueueKey<K>, Tasks[K]['input']>,
  ) => void;
  onSettled?: <K extends keyof Tasks>(
    request: PendingRequest<QueueKey<K>, Tasks[K]['input']>,
    result: { status: 'success'; duration: number; result: Tasks[K]['output'] }
      | { status: 'cancelled'; error: unknown; duration: number }
      | { status: 'error'; error: unknown; duration: number },
  ) => void;
}

/**
 * Task to enqueue.
 */
export interface QueueTask<
  Key extends QueueKey = QueueKey,
  Input = unknown,
  Output = unknown,
> {
  name: string;
  key: Key;
  input?: Input;
  schedule?: Schedule | undefined;
  handler: (ctx: { signal: AbortSignal }) => Promise<Output>;
}

/**
 * Queued task info (public).
 */
export interface QueuedTask<Key extends QueueKey = QueueKey> {
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
export const microtask: Schedule = (flush) => {
  let cancelled = false;

  queueMicrotask(() => {
    if (!cancelled) flush();
  });

  return () => {
    cancelled = true;
  };
};

/**
 * Delay execution by ms. Resets on each new request.
 *
 * @param ms - Milliseconds to delay
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout}
 */
export function delay(ms: number): Schedule {
  return (flush) => {
    const id = setTimeout(flush, ms);
    return () => clearTimeout(id);
  };
}

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue<Tasks extends TaskTypes = DefaultTaskTypes> {
  readonly #scheduler: Schedule;
  readonly #onDispatch: QueueConfig<Tasks>['onDispatch'];
  readonly #onSettled: QueueConfig<Tasks>['onSettled'];

  readonly #queued = new Map<QueueKey, QueuedRequest>();
  readonly #pending = new Map<QueueKey, PendingRequest>();
  readonly #epochs = new Map<QueueKey, number>();

  #destroyed = false;

  constructor(config: QueueConfig<Tasks> = {}) {
    this.#scheduler = config.scheduler ?? microtask;

    // Wrap callbacks to catch errors and prevent breaking queue/scheduler
    const safeCallback = <Args extends [PendingRequest, ...unknown[]]>(callback: ((...args: Args) => unknown) | undefined) => {
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

  get queued(): ReadonlyMap<QueueKey<keyof Tasks>, QueuedTask<QueueKey<keyof Tasks>>> {
    const result = new Map<QueueKey, QueuedTask>();

    for (const [k, v] of this.#queued) {
      result.set(k, { name: v.name, key: v.key });
    }

    return result;
  }

  get pending(): ReadonlyMap<QueueKey<keyof Tasks>, PendingRequest<QueueKey<keyof Tasks>>> {
    return new Map(this.#pending);
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  enqueue<K extends QueueKey<keyof Tasks>>(
    task: QueueTask<K, Tasks[K]['input'], Tasks[K]['output']>,
  ): Promise<Tasks[K]['output']> {
    const { name, key, input, schedule, handler } = task;

    if (this.#destroyed) {
      return Promise.reject(new Error('Queue destroyed'));
    }

    // Increment epoch
    const epoch = (this.#epochs.get(key) ?? 0) + 1;
    this.#epochs.set(key, epoch);

    // Cancel any queued request with same key
    const queued = this.#queued.get(key);
    queued?.invalidate?.();
    queued?.reject(new RequestCancelledError());

    // Abort any pending request with same key
    this.#pending.get(key)?.abort.abort();

    return new Promise<Tasks[K]['output']>((resolve, reject) => {
      const request: QueuedRequest = {
        id: Symbol('@videojs/request'),
        name,
        key,
        input,
        epoch,
        schedule,
        handler,
        resolve,
        reject,
      };

      this.#queued.set(key, request);

      try {
        const scheduleFlush = schedule ?? this.#scheduler;

        let flushed = false;

        // Guard against multiple flushes
        const safeFlush = () => {
          if (flushed) return;
          flushed = true;
          this.#flushKey(key);
        };

        const cancel = scheduleFlush(safeFlush);

        // Only set invalidate if we haven't already flushed
        if (!flushed && isFunction(cancel)) {
          request.invalidate = cancel;
        }
      } catch (err) {
        this.#queued.delete(key);
        reject(err);
      }
    });
  }

  dequeue<K extends QueueKey<keyof Tasks>>(key: K): boolean {
    const queued = this.#queued.get(key);
    if (!queued) return false;

    queued.invalidate?.();
    queued.reject(new RequestCancelledError('Dequeued'));
    this.#queued.delete(key);

    return true;
  }

  clear(): void {
    for (const queued of this.#queued.values()) {
      queued.invalidate?.();
      queued.reject(new RequestCancelledError('Cleared'));
    }

    this.#queued.clear();
  }

  flush(): Promise<void>;
  flush<K extends QueueKey<keyof Tasks>>(key: K): Promise<void>;
  async flush(key?: QueueKey): Promise<void> {
    if (!isUndefined(key)) {
      await this.#flushKey(key);
      return;
    }

    // Flush all
    const keys = [...this.#queued.keys()];
    await Promise.allSettled(keys.map(k => this.#flushKey(k)));
  }

  abort<K extends QueueKey<keyof Tasks>>(key: K, reason = 'Aborted'): void {
    // Reject queued
    const queued = this.#queued.get(key);
    queued?.invalidate?.();
    queued?.reject(new RequestCancelledError(reason));
    this.#queued.delete(key);

    // Abort pending
    this.#pending.get(key)?.abort.abort();
  }

  abortAll(reason = 'Aborted'): void {
    // Reject all queued
    for (const queued of this.#queued.values()) {
      queued.invalidate?.();
      queued.reject(new RequestCancelledError(reason));
    }

    this.#queued.clear();

    // Abort all pending
    for (const pending of this.#pending.values()) {
      pending.abort.abort();
    }
  }

  destroy(): void {
    if (this.#destroyed) return;

    this.#destroyed = true;
    this.abortAll('Queue destroyed');
    this.#pending.clear();
    this.#epochs.clear();
  }

  async #flushKey(key: QueueKey): Promise<void> {
    if (this.#destroyed) return;

    const request = this.#queued.get(key);
    if (!request) return;

    this.#queued.delete(key);

    await this.#executeNow(request);
  }

  async #executeNow(request: QueuedRequest): Promise<void> {
    const { id, name, key, input, epoch, handler, resolve, reject } = request;

    // Check if still valid (might have been superseded)
    if (this.#epochs.get(key) !== epoch) {
      reject(new RequestSupersededError());
      return;
    }

    const abort = new AbortController();
    const startedAt = Date.now();

    const pending: PendingRequest = {
      id,
      name,
      key,
      input,
      epoch,
      startedAt,
      abort,
    };

    this.#pending.set(key, pending);
    this.#onDispatch?.(pending);

    try {
      const result = await handler({ signal: abort.signal });

      // Check if superseded during execution
      if (this.#epochs.get(key) !== epoch) {
        throw new RequestSupersededError();
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
      // Only remove if we're still the pending request for this key
      if (this.#pending.get(key) === pending) {
        this.#pending.delete(key);
      }

      // Clean up epoch if nothing else is queued/pending for this key
      if (!this.#queued.has(key) && !this.#pending.has(key)) {
        this.#epochs.delete(key);
      }
    }
  }
}

// ----------------------------------------
// Factory
// ----------------------------------------

/**
 * Create a queue for managing request execution.
 *
 * - Same key = supersede previous (cancel queued, abort pending)
 * - Requests scheduled via schedule function (default: microtask)
 *
 * @example
 * // Loose typing (default)
 * const queue = createQueue();
 *
 * @example
 * // Strongly typed keys
 * const queue = createQueue<{
 *   'playback': { input: void; output: void };
 *   'volume': { input: number; output: void };
 * }>();
 */
export function createQueue<Tasks extends TaskTypes = DefaultTaskTypes>(
  config: QueueConfig<Tasks> = {},
): Queue<Tasks> {
  return new Queue<Tasks>(config);
}
