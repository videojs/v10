/** Format a value for display. */

/** @label Number */
export function useFormat(value: number): string;
/** @label String */
export function useFormat(value: string): string;
export function useFormat(value: number | string): string {
  return String(value);
}
