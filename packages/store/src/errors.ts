interface ErrorOptions {
  cause?: unknown;
}

export class StoreError extends Error {
  cause?: unknown;

  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'StoreError';
    this.cause = options?.cause;
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return error instanceof StoreError;
}
