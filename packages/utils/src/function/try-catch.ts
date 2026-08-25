/**
 * Wrap a function to catch and handle errors instead of throwing.
 *
 * @example
 * ```ts
 * const safeFn = tryCatch(riskyFn, (e) => logger.error(e));
 * safeFn?.(); // Never throws
 * ```
 */
export function tryCatch<T extends (...args: any[]) => ReturnType<T>>(
  fn: T | undefined,
  onError: (error: Error) => void = console.error
): T | undefined {
  if (!fn) return undefined;

  return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ ((
    ...args: Parameters<T>
  ) => {
    try {
      return fn(...args);
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }) as T;
}
