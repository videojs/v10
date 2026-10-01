'use client';

import { isFunction } from '@videojs/utils/predicate';
import type { Ref, RefCallback } from 'react';
import { useCallback } from 'react';

type OptionalRef<T> = Ref<T> | undefined;

/**
 * Set a given ref to a given value.
 *
 * Handles both callback refs and RefObject(s).
 *
 * @returns Cleanup function if the ref callback returned one (React 19 callback refs)
 */
function setRef<T>(ref: OptionalRef<T>, value: T): (() => void) | void | undefined {
  if (isFunction(ref)) {
    return ref(value);
  } else if (ref !== null && ref !== undefined) {
    ref.current = value;
  }
}

/**
 * Compose multiple refs into a single callback ref.
 *
 * The composed ref never returns a cleanup: React 18 ignores one and warns on every mount. Detach is handled on the
 * `null` call that both React 18 and 19 make when no cleanup is returned, which runs any cleanup an inner callback ref
 * handed back (React 19 style) and clears every other ref.
 *
 * @example
 *   ```tsx
 *   const composedRef = composeRefs(ref1, ref2, ref3);
 *   return <div ref={composedRef} />;
 *   ```;
 *
 * @internal
 */
export function composeRefs<T>(...refs: (OptionalRef<T> | OptionalRef<T>[])[]): RefCallback<T> {
  const flatRefs = refs.flat();
  let cleanups: ((() => void) | void | undefined)[] = [];

  return (node) => {
    const previous = cleanups;

    cleanups = [];

    for (let i = 0; i < flatRefs.length; i++) {
      const cleanup = previous[i];

      if (isFunction(cleanup)) cleanup();
      else if (node === null) setRef(flatRefs[i], null);
    }

    if (node === null) return;

    cleanups = flatRefs.map((ref) => setRef(ref, node));
  };
}

/**
 * Hook that composes multiple refs into a single callback ref.
 *
 * Memoized for stable reference.
 *
 * @example
 *   ```tsx
 *   const composedRef = useComposedRefs(forwardedRef, localRef);
 *   return <div ref={composedRef} />;
 *   ```;
 *
 * @param refs - Refs to update from the returned callback.
 */
export function useComposedRefs<T>(...refs: OptionalRef<T>[]): RefCallback<T> {
  return useCallback(composeRefs(...refs), [...refs]);
}
