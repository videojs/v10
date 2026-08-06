export interface PublicPromise<T> extends Promise<T> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

/**
 * A promise that can be settled from outside the executor. Embed hosts use one
 * as a load barrier: calls that need a loaded player await it, and whichever
 * event finishes the load resolves it.
 */
export function createPublicPromise<T>(): PublicPromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  }) as PublicPromise<T>;
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}
