/**
 * Result of a guard check.
 *
 * - Truthy → proceed
 * - Falsy → cancel
 * - Promise resolves truthy → proceed
 * - Promise resolves falsy → cancel
 * - Promise rejects → cancel
 */
export type GuardResult = boolean | Promise<unknown>;

/**
 * Context passed to guard functions.
 */
export interface GuardContext<Target> {
  target: Target;
  signal: AbortSignal;
}

/**
 * A guard gates request execution.
 */
export type Guard<Target> = (ctx: GuardContext<Target>) => GuardResult;
