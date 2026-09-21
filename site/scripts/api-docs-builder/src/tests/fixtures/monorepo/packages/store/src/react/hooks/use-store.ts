interface Store<S> {
  getState(): S;
}

interface Selector<State, Result> {
  (state: State): Result;
  displayName?: string;
}

/** Subscribe to a store. */
export function useStore<S>(store: Store<S>): S;
export function useStore<S, R>(store: Store<S>, selector: Selector<S, R>): R;
export function useStore<S, R>(_store: Store<S>, _selector?: Selector<S, R>): S | R {
  return {} as S | R;
}
