import { isObject } from '../predicate';
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

export type Flattened<ObjectType extends object> = Record<string, ObjectType[keyof ObjectType]>;

export function flatten<ObjectType extends object>(object: ObjectType, options: FlattenOptions = {}) {
  const { prefix = '' } = options;
  const result: Partial<Flattened<ObjectType>> = {};

  for (const [key, value] of Object.entries(object)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && isObject(value) && !Array.isArray(value)) {
      Object.assign(result, flatten(value, { prefix: fullKey }));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
