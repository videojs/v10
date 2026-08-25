export type StoreErrorCode =
  /** Store was destroyed. */
  | 'DESTROYED'
  /** No target is attached to the store. */
  | 'NO_TARGET';

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

export function isStoreError<Value>(error: Value): error is Value & StoreError {
  return error instanceof StoreError;
}

export function throwNoTargetError(): never {
  throw new StoreError('NO_TARGET');
}

export function throwDestroyedError(): never {
  throw new StoreError('DESTROYED');
}
