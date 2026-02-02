import { useRef, useSyncExternalStore } from 'react';
import { type Comparator, type Selector, shallowEqual } from '../../core/shallow-equal';

export type { Comparator, Selector };

/** Subscribe to derived state with customizable equality check. */
export function useSelector<S, R>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => S,
  selector: Selector<S, R>,
  isEqual: Comparator<R> = shallowEqual
): R {
  const cache = useRef<R | undefined>(undefined);

  const getSelectedSnapshot = () => {
    const next = selector(getSnapshot());

    if (cache.current !== undefined && isEqual(cache.current, next)) {
      return cache.current;
    }

    cache.current = next;

    return next;
  };

  return useSyncExternalStore(subscribe, getSelectedSnapshot, getSelectedSnapshot);
}
