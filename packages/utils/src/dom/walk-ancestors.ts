import { isUndefined } from '../predicate';

export function walkAncestors<Value>(
  start: Element | null,
  callback: (node: Element) => Value | undefined
): Value | undefined {
  if (!start || typeof document === 'undefined') {
    return undefined;
  }

  let node: Element | null = start;
  while (node) {
    const value = callback(node);
    if (!isUndefined(value)) {
      return value;
    }
    node = node.parentElement;
  }
  return undefined;
}
