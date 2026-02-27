/** A throttled function that can be cancelled. */
export interface Throttled<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancel any pending trailing-edge invocation. */
  cancel(): void;
}

/**
 * Trailing-edge throttle: the first call schedules a timer; subsequent calls
 * within the window update the arguments. The function fires once per `ms`
 * window with the latest arguments.
 */
export function throttle<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): Throttled<Args> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Args;

  const throttled = (...args: Args): void => {
    latestArgs = args;
    if (timerId !== null) return;
    timerId = setTimeout(() => {
      timerId = null;
      fn(...latestArgs);
    }, ms);
  };

  throttled.cancel = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return throttled;
}
