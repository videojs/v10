export function isString<Value>(value: Value): value is Value & string {
  return typeof value === 'string';
}

export function isNumber<Value>(value: Value): value is Value & number {
  return typeof value === 'number';
}

export function isBoolean<Value>(value: Value): value is Value & boolean {
  return typeof value === 'boolean';
}

export function isFunction<Value>(value: Value): value is Value & ((...args: any[]) => any) {
  return typeof value === 'function';
}

export function isNull<Value>(value: Value): value is Value & null {
  return value === null;
}

export function isUndefined<Value>(value: Value): value is Value & undefined {
  return typeof value === 'undefined';
}

export function isNil<Value>(value: Value): value is Value & (null | undefined) {
  return value == null;
}

export function isPromise<Value>(value: Value): value is Value & Promise<any> {
  return value instanceof Promise;
}

/**
 * Check if a value is an object, excluding null.
 */
export function isObject<Value>(value: Value): value is Value & object {
  return value !== null && typeof value === 'object';
}

/**
 * Check if a value is an object carrying a callable method for every given name.
 *
 * Recognizes a foreign object by the shape a caller needs from it, without
 * importing the library that defines it or testing against its class.
 */
type MethodSet<Key extends PropertyKey> = { [Name in Key]: CallableFunction };

export function hasMethods<Value, K extends string>(
  value: Value,
  methods: readonly K[]
): value is Value & MethodSet<K> {
  if (!isObject(value)) return false;
  // SAFETY: Each requested key is checked for presence and callability below.
  const candidates = value as Partial<MethodSet<K>>;
  return methods.every((method) => method in value && isFunction(candidates[method]));
}

/**
 * Check if a value is a plain object (not a class instance like Date, Map, etc).
 */
export function isPlainObject<Value>(value: Value): value is Value & Record<string, Value[keyof Value & string]> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Check if a value is an AbortError.
 */
export function isAbortError<Value>(value: Value): value is Value & Error {
  return value instanceof Error && value.name === 'AbortError';
}
