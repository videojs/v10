/**
 * Error codes for store operations.
 *
 * @example
 * ```ts
 * if (isStoreError(error)) {
 *   switch (error.code) {
 *     case 'SUPERSEDED':
 *       // Request was replaced by another - expected behavior
 *       break;
 *     case 'REJECTED':
 *       // Guard condition failed
 *       break;
 *   }
 * }
 * ```
 */
export type StoreErrorCode
  /** Request was aborted via AbortSignal - user or system requested cancellation. */
  = | 'ABORTED'
  /** Request was cancelled by another request's `cancel` configuration. */
    | 'CANCELLED'
  /** Store or queue was destroyed - lifecycle ended. */
    | 'DESTROYED'
  /** Target was detached while request was in flight. */
    | 'DETACHED'
  /** No target is attached to the store. */
    | 'NO_TARGET'
  /** Guard condition returned falsy - request preconditions not met. */
    | 'REJECTED'
  /** Task was removed from queue via `dequeue()` or `clear()`. */
    | 'REMOVED'
  /** Request was replaced by a newer request with the same key. */
    | 'SUPERSEDED'
  /** Guard condition timed out waiting for a truthy result. */
    | 'TIMEOUT';

export interface StoreErrorOptions {
  cause?: unknown;
  message?: string;
}

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  cause?: unknown;

  constructor(code: StoreErrorCode, options?: StoreErrorOptions) {
    super(options?.message ?? code);
    this.name = 'StoreError';
    this.code = code;
    this.cause = options?.cause;
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return error instanceof StoreError;
}
