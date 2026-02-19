interface Store<S> {
  getState(): S;
}

type SelectorFn<S, R> = (state: S) => R;

/** Create a memoized selector function. */
export function createSelector<S, R>(fn: SelectorFn<S, R>): SelectorFn<S, R> {
  return fn;
}
