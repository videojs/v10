import { anyAbortSignal } from '@videojs/utils/events';
import { generateId } from '@videojs/utils/string';

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
  /** Run the work, memoized: repeated calls share one execution + result. */
  run(): Promise<TValue>;
  abort(): void;
  /** A fresh, structurally identical task (same work + id) in a pending state — for re-running. */
  clone(): TaskLike<TValue, TError>;
}

/**
 * Generic reusable task that wraps an async run function.
 *
 * Owns its own AbortController so it can always be aborted independently.
 * Optionally composes an external AbortSignal so that a parent's cancellation
 * propagates into the task's work without requiring the caller to track the
 * task separately.
 *
 * `run()` is memoized: the work runs at most once per instance, and every call
 * returns the same promise (so observers can `await run()` to read the result
 * without re-triggering the work). To re-run the *same* work, take a `clone()` —
 * a fresh instance with its own AbortController and a pending state.
 *
 * Ordering guarantee: `value` is written before `status` transitions to `'done'`;
 * `error` is written before `status` transitions to `'error'`. Any reader
 * observing `status === 'done'` is guaranteed `value` is already present.
 */
export class Task<TValue = void, TError = unknown> implements TaskLike<TValue, TError> {
  readonly id: string;
  readonly #runFn: (signal: AbortSignal) => Promise<TValue>;
  readonly #externalSignal: AbortSignal | undefined;
  readonly #abortController = new AbortController();
  readonly #signal: AbortSignal;

  #status: TaskStatus = 'pending';
  #value: TValue | undefined = undefined;
  #error: TError | undefined = undefined;
  #promise: Promise<TValue> | undefined = undefined;

  constructor(runFn: (signal: AbortSignal) => Promise<TValue>, config?: TaskConfig) {
    this.#runFn = runFn;
    const rawId = config?.id;
    this.id = typeof rawId === 'function' ? rawId() : (rawId ?? generateId());
    this.#externalSignal = config?.signal;
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

  run(): Promise<TValue> {
    // Memoized: run the work once; repeated calls share the same promise (which
    // resolves/rejects immediately once settled). Re-running needs a `clone()`.
    this.#promise ??= (async () => {
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
    })();
    return this.#promise;
  }

  abort(): void {
    this.#abortController.abort();
  }

  /**
   * A fresh task with the same work, id, and external signal, in a pending state
   * (its own AbortController, no memoized result) — so it can be run again. Used
   * to re-run structurally identical work (e.g. `RecurringRunner` reloads).
   */
  clone(): Task<TValue, TError> {
    return new Task<TValue, TError>(this.#runFn, { id: this.id, signal: this.#externalSignal });
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
  readonly #pending = new Map<string, { task: TaskLike<unknown, unknown>; promise: Promise<unknown> }>();
  #settled: Promise<void> = Promise.resolve();
  #resolveSettled: (() => void) | null = null;
  #destroyed = false;

  schedule<TValue = void, TError = unknown>(task: TaskLike<TValue, TError>): Promise<TValue> {
    if (this.#destroyed) return Promise.resolve() as Promise<TValue>;
    const existing = this.#pending.get(task.id);
    if (existing) return existing.promise as Promise<TValue>;

    if (this.#pending.size === 0) {
      this.#settled = new Promise((resolve) => {
        this.#resolveSettled = resolve;
      });
    }

    const promise = task.run();
    // Suppress unhandled rejection for callers that ignore the return value.
    promise.catch(() => {});
    // Cleanup: update pending and resolve settled regardless of outcome.
    const cleanup = () => {
      this.#pending.delete(task.id);
      if (this.#pending.size === 0) {
        this.#resolveSettled?.();
        this.#resolveSettled = null;
      }
    };
    promise.then(cleanup, cleanup);

    this.#pending.set(task.id, { task: task as TaskLike<unknown, unknown>, promise: promise as Promise<unknown> });
    return promise;
  }

  /**
   * Registers a callback to fire when all currently in-flight tasks settle.
   * If the runner is already idle, the callback is never called. If abortAll()
   * is called before the batch settles, the callback is superseded and silently
   * dropped — no stale callbacks, no generation token required by the caller.
   */
  whenSettled(callback: () => void): void {
    if (this.#pending.size === 0) return;
    const captured = this.#settled;
    captured.then(
      () => {
        if (this.#settled !== captured) return;
        callback();
      },
      () => {}
    );
  }

  abortAll(): void {
    for (const { task } of this.#pending.values()) task.abort();
    this.#pending.clear();
    // Resolve the current settled promise so any .then() handlers are queued,
    // then replace the reference — whenSettled callbacks that captured the old
    // reference will see the identity mismatch and be dropped.
    this.#resolveSettled?.();
    this.#resolveSettled = null;
    this.#settled = Promise.resolve();
  }

  destroy(): void {
    this.#destroyed = true;
    this.abortAll();
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
  #destroyed = false;

  schedule<TValue = void, TError = unknown>(task: TaskLike<TValue, TError>): Promise<TValue> {
    if (this.#destroyed) return Promise.resolve() as Promise<TValue>;
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

  /**
   * A promise that resolves when all currently-scheduled tasks have settled.
   * Use the reference as a generation token: capture it after scheduling a
   * batch, then check identity in the resolution callback to detect whether
   * a subsequent abortAll() + new batch has superseded this one.
   */
  get settled(): Promise<void> {
    return this.#chain as Promise<void>;
  }

  /**
   * Registers a callback to fire when all currently-pending tasks settle.
   * If the runner is already idle (no pending or running tasks), the callback
   * is never called. If new tasks are scheduled before the current batch
   * settles, the callback is superseded and silently dropped — no stale
   * callbacks, no generation token required by the caller.
   */
  whenSettled(callback: () => void): void {
    if (this.#pending.size === 0 && this.#current === null) return;
    const currentChain = this.#chain;
    currentChain.then(
      () => {
        if (this.#chain !== currentChain) return;
        callback();
      },
      () => {}
    );
  }

  /** Aborts and clears queued tasks without touching the in-flight task. */
  abortPending(): void {
    for (const task of this.#pending) task.abort();
    this.#pending.clear();
  }

  abortAll(): void {
    this.abortPending();
    this.#current?.abort();
  }

  destroy(): void {
    this.#destroyed = true;
    this.abortAll();
  }
}

// =============================================================================
// RecurringRunner
// =============================================================================

/**
 * Decides whether — and *when* — a {@link RecurringRunner} re-runs its task.
 * Invoked **concurrently with the run** (so the inter-run interval can be
 * measured from when the run *started*, not when it finished), with:
 * - `task` — the in-flight run, observable via the memoized `task.run()` (does
 *   not re-trigger work), e.g. to read its result for a cadence/stop decision.
 * - `previous` — the prior successful run's value (`undefined` on the first),
 *   for decisions that compare consecutive results.
 * - `signal` — aborts the wait (and the recurrence).
 *
 * Resolves `true` to re-run (after whatever delay it owns) or `false` to stop.
 * The runner deals only in this awaitable verdict — *how* the delay is produced
 * (a timer, a frame, an event) and *when* it's measured from live entirely in
 * the reschedule function, so the runner itself knows nothing about time. See
 * `delayedReschedule` for the common timer-based, start-anchored implementation.
 */
export type Reschedule<TValue> = (
  task: TaskLike<TValue>,
  previous: TValue | undefined,
  signal: AbortSignal
) => PromiseLike<boolean>;

/**
 * Runs a task, then re-runs it whenever a {@link Reschedule} function says to,
 * until it says stop (or it's aborted) — the recurring sibling of
 * {@link ConcurrentRunner} / {@link SerialRunner}, and like them it's handed a
 * {@link TaskLike} to run.
 *
 * The runner has no notion of time: it just awaits whatever `reschedule`
 * returns (a promise → re-run when it resolves; `null` → stop). With no
 * reschedule it runs the task exactly once (the non-recurring default).
 *
 * Single-slot, keyed by task **id**: there is always at most one identified
 * active task for re-running. Scheduling a task whose id matches the active one
 * is a no-op — the existing recurrence keeps running (dedup by id). Scheduling a
 * task with a *different* id aborts the prior task's in-flight run and pending
 * reschedule, then takes over the slot (abort-and-replace) — the right shape
 * when there's one logical unit of recurring work (e.g. reloading the *selected*
 * track's media playlist).
 *
 * Each re-run is a fresh `clone()` of the task (since `Task.run()` is memoized —
 * the same instance won't re-execute), carrying the same id so the slot's
 * identity is stable across cycles. The run function should read any inputs that
 * change between cycles at call time rather than capturing them once.
 * `abortAll()` aborts the in-flight task and the pending reschedule; an aborted
 * (or stopped) recurrence frees the slot, so a later schedule of the same id
 * starts fresh.
 */
export class RecurringRunner<TValue = unknown> {
  readonly #reschedule: Reschedule<TValue> | undefined;
  // The identified active task — the one being (re)run. Held across cycles
  // (including the inter-cycle wait); null once the recurrence stops/aborts.
  #active: TaskLike<TValue, unknown> | null = null;
  // Aborts the active recurrence: its in-flight run (via the task) and the
  // pending reschedule await (via the signal passed to `reschedule`).
  #abort: AbortController | null = null;
  #destroyed = false;

  constructor(reschedule?: Reschedule<TValue>) {
    this.#reschedule = reschedule;
  }

  schedule(task: TaskLike<TValue, unknown>): void {
    if (this.#destroyed) return;
    // Dedup by id: this id is already the active re-run target, so the existing
    // recurrence continues uninterrupted (don't restart it).
    if (this.#active?.id === task.id) return;
    // Different id supersedes: abort the prior recurrence, then take over as the
    // one identified active task.
    this.#cancel();
    this.#active = task;
    const ac = new AbortController();
    this.#abort = ac;
    void this.#loop(task, ac);
  }

  async #loop(task: TaskLike<TValue, unknown>, ac: AbortController): Promise<void> {
    const signal = ac.signal;
    let current = task;
    let previous: TValue | undefined;
    while (!signal.aborted) {
      let result: TValue | undefined;
      let again = false;
      try {
        // Start the run and the reschedule together: reschedule observes the run
        // (via the memoized `task.run()`) and owns the inter-run delay, so the
        // interval can be measured from the run's *start*. `Promise.all` waits
        // for both — the result (the next cycle's `previous`) and the verdict +
        // delay. An errored run resolves to `undefined`, leaving the retry/stop
        // choice to reschedule.
        [result, again] = await Promise.all([
          current.run().then(
            (value) => value,
            () => undefined
          ),
          this.#reschedule ? this.#reschedule(current, previous, signal) : Promise.resolve(false),
        ]);
      } catch {
        return; // reschedule rejected (aborted during its delay) — stop without freeing
      }
      if (signal.aborted || !again) break;
      // Only a successful run advances the comparison baseline.
      if (result !== undefined) previous = result;
      // Re-run the same work as a fresh task — `run()` is memoized, so re-running
      // `current` wouldn't re-execute. The clone keeps the id (stable slot
      // identity); track it as active so an abort hits the in-flight instance.
      current = current.clone();
      this.#active = current;
    }
    // Loop ended on its own terms (stop / aborted-but-not-cancelled): free the
    // slot iff this loop still owns it (a supersede/abortAll swapped #abort).
    if (this.#abort === ac) {
      this.#active = null;
      this.#abort = null;
    }
  }

  #cancel(): void {
    this.#abort?.abort();
    this.#abort = null;
    this.#active?.abort();
    this.#active = null;
  }

  abortAll(): void {
    this.#cancel();
  }

  destroy(): void {
    this.#destroyed = true;
    this.abortAll();
  }
}
