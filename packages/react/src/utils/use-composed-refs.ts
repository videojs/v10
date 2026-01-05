'use client';

import type { MutableRefObject, Ref, RefCallback } from 'react';

import { useCallback } from 'react';

type PossibleRef<T> = Ref<T> | undefined;

/**
 * Set a given ref to a given value.
 * Handles both callback refs and RefObject(s).
 *
 * @returns Cleanup function if the ref callback returned one (React 19+)
 */
function setRef<T>(ref: PossibleRef<T>, value: T): (() => void) | void | undefined {
  if (typeof ref === 'function') {
    return ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as MutableRefObject<T>).current = value;
  }
}

/**
 * Compose multiple refs into a single callback ref.
 * Supports callback refs and RefObject(s).
 *
 * @example
 * ```tsx
 * const composedRef = composeRefs(ref1, ref2, ref3);
 * return <div ref={composedRef} />;
 * ```
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  return (node): (() => void) | void => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup === 'function') {
        hasCleanup = true;
      }
      return cleanup;
    });

    // React 19 supports cleanup functions from callback refs
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === 'function') {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

/**
 * Hook that composes multiple refs into a single callback ref.
 * Memoized for stable reference.
 *
 * @example
 * ```tsx
 * const composedRef = useComposedRefs(forwardedRef, localRef);
 * return <div ref={composedRef} />;
 * ```
 */
export function useComposedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(composeRefs(...refs), refs);
}
