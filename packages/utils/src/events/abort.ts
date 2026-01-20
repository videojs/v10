/**
 * Race a promise against an abort signal. Rejects immediately if the signal
 * is already aborted or becomes aborted before the promise settles.
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  let onAbort: () => void;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
    }),
  ]).finally(() => {
    signal.removeEventListener('abort', onAbort);
  });
}
