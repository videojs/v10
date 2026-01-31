import { abortable } from '@videojs/utils/events';
import { StoreError } from './errors';

/** Cancel all pending tasks (nuclear reset). */
export const CANCEL_ALL = Symbol.for('@videojs/cancel-all');

// ----------------------------------------
// Types
// ----------------------------------------

export type TaskKey = string | symbol;

export type TaskMode = 'exclusive' | 'shared';

export interface QueueTask<Output = unknown> {
  key: TaskKey;
  mode?: TaskMode;
  handler: (ctx: { signal: AbortSignal }) => Promise<Output>;
}

// ----------------------------------------
// Implementation
// ----------------------------------------

export class Queue {
  #pending = new Map<TaskKey, AbortController>();
  #shared = new Map<TaskKey, Promise<unknown>>();
  #destroyed = false;

  get destroyed(): boolean {
    return this.#destroyed;
  }

  enqueue<Output>({ key, mode = 'exclusive', handler }: QueueTask<Output>): Promise<Output> {
    if (this.#destroyed) {
      return Promise.reject(new StoreError('DESTROYED'));
    }

    // Shared mode: join existing
    if (mode === 'shared') {
      const existing = this.#shared.get(key);
      if (existing) return existing as Promise<Output>;
    }

    // Supersede pending with same key
    this.#pending.get(key)?.abort(new StoreError('SUPERSEDED'));

    const abort = new AbortController();
    this.#pending.set(key, abort);

    // Wrap with abortable so promise rejects on abort even if handler doesn't handle signal
    const promise = abortable(handler({ signal: abort.signal }), abort.signal).finally(() => {
      this.#pending.delete(key);
      this.#shared.delete(key);
    });

    if (mode === 'shared') {
      this.#shared.set(key, promise);
    }

    return promise;
  }

  abort(key?: TaskKey): void {
    if (key !== undefined) {
      this.#pending.get(key)?.abort(new StoreError('ABORTED'));
      return;
    }

    const error = new StoreError('ABORTED');
    for (const controller of this.#pending.values()) {
      controller.abort(error);
    }
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.abort();
    this.#pending.clear();
    this.#shared.clear();
  }
}
