export { shallowEqual } from '@videojs/utils/object';

export interface Selector<State, Result> {
  (state: State): Result;
  displayName?: string | undefined;
}

export type Comparator<T> = (a: T, b: T) => boolean;
