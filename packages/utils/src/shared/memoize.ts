// Adapted from https://github.com/caiogondim/fast-memoize.js - MIT License
type MemoizedFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => ReturnType<T>;

interface MemoizedId {
  $m: number;
}

interface MemoizedWithId {
  $m?: number;
}

function isNode(x: unknown): boolean {
  if (typeof globalThis === 'undefined') return false;
  const NodeConstructor = (globalThis as { Node?: new () => unknown }).Node;
  return NodeConstructor !== undefined && x instanceof NodeConstructor;
}

export function memoize<T extends (...args: any[]) => any>(
  func: T,
): MemoizedFunction<T> {
  const cache: Record<string, ReturnType<T>> = {};
  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const argsWithFuncIds = args.map((x) => {
      if (isPlainObject(x) || Array.isArray(x)) {
        const obj: Record<string, unknown> = {};
        for (const key in x) {
          obj[key] = memoizedIdFunc((x as Record<string, unknown>)[key]);
        }
        return obj;
      }
      return memoizedIdFunc(x);
    });

    const cacheKey = JSON.stringify(argsWithFuncIds);
    const cachedValue = cache[cacheKey];
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const computedValue = func.apply(this, args);
    cache[cacheKey] = computedValue;
    return computedValue;
  };
}

let id = 0;
function memoizedIdFunc(x: unknown): unknown {
  if (typeof x === 'function' || isNode(x)) {
    const funcOrNode = x as MemoizedWithId;
    if (!funcOrNode.$m) funcOrNode.$m = ++id;
    return { $m: funcOrNode.$m } as MemoizedId;
  }
  return x;
}

/**
 * Check if this is a plain obect.
 * @param {object} obj - The object to inspect.
 * @return {boolean}
 */
function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}
