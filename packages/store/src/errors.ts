export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

export class RequestCancelledError extends StoreError {
  constructor(public reason: string = 'Request cancelled') {
    super(reason);
    this.name = 'RequestCancelledError';
  }
}

export class RequestSupersededError extends RequestCancelledError {
  constructor() {
    super('Request superseded');
    this.name = 'RequestSupersededError';
  }
}

export class NoTargetError extends StoreError {
  constructor() {
    super('No target attached to store');
    this.name = 'NoTargetError';
  }
}

export class GuardRejectedError extends StoreError {
  constructor(public guard: string) {
    super(`Guard rejected: ${guard}`);
    this.name = 'GuardRejectedError';
  }
}

export class GuardTimeoutError extends StoreError {
  constructor(public guard: string) {
    super(`Guard timed out: ${guard}`);
    this.name = 'GuardTimeoutError';
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return error instanceof StoreError;
}

export function isRequestCancelledError(error: unknown): error is RequestCancelledError {
  return error instanceof RequestCancelledError;
}
