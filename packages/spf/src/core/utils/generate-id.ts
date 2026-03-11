/**
 * Generate unique ID for HAM objects.
 *
 * Uses timestamp + random number for sufficient uniqueness.
 * IDs are strings without decimals.
 *
 * @returns Unique string ID in format: timestamp-random
 *
 * @example
 * ```ts
 * const id = generateId();  // "1738423156789-542891"
 * ```
 */
export function generateId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}
