let id = 0;

/**
 * Generates a unique ID for an element.
 */
export function uniqueId(): string {
  id++;
  return `:h${id}:`;
}
