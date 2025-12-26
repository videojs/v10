export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isNil(value: unknown): value is null | undefined {
  return value == null;
}

export function isPromise(value: unknown): value is Promise<any> {
  return value instanceof Promise;
}

/**
 * Check if a value is an object, excluding null.
 */
export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

/**
 * Check if a value is an AbortError.
 */
export function isAbortError(value: unknown): value is Error {
  return (
    value instanceof Error
    && value.name === 'AbortError'
  );
}
