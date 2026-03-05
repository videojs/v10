interface Store<S> {
  getState(): S;
}

/** Subscribe to a store. */
export function useStore<S>(store: Store<S>): S;
export function useStore<S, R>(store: Store<S>, selector: (state: S) => R): R;
export function useStore<S, R>(store: Store<S>, selector?: (state: S) => R): S | R {
  return {} as S | R;
}
