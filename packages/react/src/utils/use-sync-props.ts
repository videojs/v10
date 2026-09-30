import { deepEqual } from '@videojs/utils/object';
import { isNull, isUndefined } from '@videojs/utils/predicate';
import { useRef } from 'react';

/**
 * Whether writing `value` over `current` would change anything the target can observe.
 *
 * Identity is the right test for a primitive, and the wrong one for an object: React builds a fresh object every render
 * for an inline prop, so an identity check reports a change on every render of any ancestor and the setter, which
 * cannot tell the two apart, treats it as a real one.
 *
 * `deepEqual` is the comparison the adapters already use to decide whether an engine needs rebuilding, so the two agree
 * on what counts as a change. It short-circuits on `Object.is`, so a callback held stable across renders compares equal
 * while a fresh inline one does not: two inline arrow functions really are different values, and nothing here can know
 * they behave the same.
 */
function isChange(current: unknown, value: unknown): boolean {
  if (current === value) return false;

  if (typeof current !== 'object' || typeof value !== 'object' || isNull(current) || isNull(value)) return true;

  try {
    return !deepEqual(current, value);
  } catch {
    // A prop value is arbitrary and this runs during render, so a structure deepEqual cannot walk, a self-referential
    // one above all, must not take the render down with it. Treating it as a change is what happened before the guard.
    return true;
  }
}

export function useSyncProps<Props extends object, Rest extends Record<string, unknown>>(
  target: Props,
  props: Partial<Props> & Rest,
  defaults: Props
): Omit<Rest, keyof Props> {
  const rest: Record<string, unknown> = {};
  const synced = new Set<string>();
  const prevSyncedRef = useRef<Set<string> | null>(null);

  const sync = (key: string, value: unknown) => {
    if (isChange(target[key as keyof Props], value)) target[key as keyof Props] = value as Props[keyof Props];
  };

  // Reset props the consumer stopped passing (or passed as `undefined`) back to
  // their defaults before applying the current ones, so a reset can never wipe a
  // value another prop derives in the same render (e.g. `source` deriving `src`).
  // Mirrors react-dom removing absent attributes.
  for (const key of prevSyncedRef.current ?? []) {
    if (isUndefined((props as Record<string, unknown>)[key])) sync(key, (defaults as Record<string, unknown>)[key]);
  }

  for (const key in props) {
    if (key in defaults) {
      if (isUndefined(props[key])) continue;

      synced.add(key);
      sync(key, props[key]);
    } else {
      rest[key] = props[key];
    }
  }

  prevSyncedRef.current = synced;

  return rest as Omit<Rest, keyof Props>;
}
