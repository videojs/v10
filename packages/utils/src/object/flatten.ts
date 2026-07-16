/**
 * Flattens nested object values into dot-separated keys.
 *
 * @param object - The object to flatten.
 * @param options - Options controlling the flattened key path.
 * @returns A new object containing the flattened values.
 *
 * @example
 * ```ts
 * flatten({ buttons: { play: 'Play' } });
 * // { 'buttons.play': 'Play' }
 * ```
 */
export interface FlattenOptions {
  prefix?: string;
}

export function flatten(object: Record<string, unknown>, options: FlattenOptions = {}): Record<string, unknown> {
  const { prefix = '' } = options;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(object)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, { prefix: fullKey }));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
