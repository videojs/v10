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
 *     case 'ABORTED':
 *       // Request was aborted
 *       break;
 *   }
 * }
 * ```
 */
export type StoreErrorCode =
  /** Request was aborted via AbortSignal. */
  | 'ABORTED'
  /** Store or queue was destroyed. */
  | 'DESTROYED'
  /** No target is attached to the store. */
  | 'NO_TARGET'
  /** Request was replaced by a newer request with the same key. */
  | 'SUPERSEDED';

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
