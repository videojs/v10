interface Store<State> {
  readonly state: State;
  getState(): State;
}

type AnyStore = Store<object>;

/** @displayType {S}['state'] */
type InferStoreState<S extends AnyStore> = S extends { readonly state: infer State } ? State : never;

type StoreMode = 'active' | 'passive';

interface StoreOptions {
  mode?: StoreMode;
  disabled?: boolean;
  ignored: string;
}

interface UseStoreOptions extends Pick<StoreOptions, 'mode' | 'disabled'> {
  label?: string;
}

interface Selector<State, Result> {
  (state: State): Result;
  displayName?: string;
}

/** Subscribe to a store. */
export function useStore<S>(store: Store<S>): S;
export function useStore<S extends AnyStore, R>(
  store: S,
  selector: Selector<InferStoreState<S>, R>,
  options?: UseStoreOptions
): R;
export function useStore<S, R>(_store: Store<S>, _selector?: Selector<S, R>, _options?: UseStoreOptions): S | R {
  return {} as S | R;
}
