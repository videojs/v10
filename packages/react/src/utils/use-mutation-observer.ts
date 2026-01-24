import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Custom React hook for observing DOM mutations using MutationObserver
 *
 * @param target - Element to observe (ref or element)
 * @param callback - Function called when mutations occur
 * @param options - MutationObserver options
 */
export function useMutationObserver<T extends Element = Element>(
  target: RefObject<T> | T | null | undefined,
  callback: MutationCallback,
  options: MutationObserverInit = {
    attributes: true,
    childList: true,
    subtree: true,
  }
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const element = target && 'current' in target ? target.current : target;

    if (!element || !(element instanceof Element)) {
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      callbackRef.current(mutations, obs);
    });

    observer.observe(element, options);

    return () => {
      observer.disconnect();
    };
  }, [target, options]);
}
