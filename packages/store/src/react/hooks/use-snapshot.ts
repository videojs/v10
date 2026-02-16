import { identity } from '@videojs/utils/function';
import type { State } from '../../core/state';
import { type Comparator, type Selector, useSelector } from './use-selector';

/**
 * Subscribe to a State container's current value.
 *
 * @param state - The State container to subscribe to.
 * @param selector - Derives a value from state.
 * @param isEqual - Custom equality function. Defaults to `shallowEqual`.
 */
export function useSnapshot<T extends object>(state: State<T>): T;

export function useSnapshot<T extends object, R>(state: State<T>, selector: Selector<T, R>, isEqual?: Comparator<R>): R;

export function useSnapshot(state: State<object>, selector?: Selector<any, any>, isEqual?: Comparator<any>) {
  return useSelector(
    (cb) => state.subscribe(cb),
    () => state.current,
    selector ?? identity,
    isEqual
  );
}
