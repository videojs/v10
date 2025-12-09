/**
 * Deep Merge Utility
 *
 * Generic deep merge for configuration objects
 * Recursively merges nested objects, with source overriding target
 */

/**
 * Recursively make all properties optional
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, any>
    ? DeepPartial<T[K]>
    : T[K];
};

/**
 * Check if value is a plain object (not array, not null, not Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep merge two objects
 * Source values override target values
 * Arrays are replaced (not merged)
 * Functions and primitives are replaced
 *
 * @param target - Base object (must be exhaustive)
 * @param source - Override object (recursively partial)
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: DeepPartial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = result[key];

    // If both are plain objects, merge recursively
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      // Otherwise, source replaces target (arrays, primitives, functions, null)
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}
