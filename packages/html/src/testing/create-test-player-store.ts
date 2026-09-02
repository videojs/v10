import type { AnyPlayerFeature, AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import type { AnySlice, StateContext, Store, UnionSliceState } from '@videojs/store';
import { combine, createStore } from '@videojs/store';

const SET_TEST_STATE = Symbol('setTestPlayerState');

interface TestStateAction<State extends object> {
  [SET_TEST_STATE](partial: Partial<State>): void;
}

export type TestPlayerStore<State extends object> = AnyPlayerStore & {
  setState(partial: Partial<State>): void;
};

/**
 * Creates a player store for component tests from the real feature definitions.
 *
 * Selectors match slices by identity, so fixtures must build stores from the same feature objects the components
 * select. `initialState` and `setState` override any published value, including actions.
 */
export function createTestPlayerStore<const Features extends readonly AnyPlayerFeature[]>(
  features: Features,
  initialState: Partial<UnionSliceState<Features>> = {}
): TestPlayerStore<UnionSliceState<Features>> {
  type State = UnionSliceState<Features>;

  // A symbol-keyed action reaches the store's `set` without becoming public state.
  const testStateFeature = {
    state: ({ set }: StateContext<PlayerTarget>): TestStateAction<State> => ({
      [SET_TEST_STATE]: (partial) => set(partial),
    }),
  };
  const store = createStore<PlayerTarget>()(
    combine(...features, testStateFeature) as AnySlice<PlayerTarget>
  ) as unknown as Store<PlayerTarget, State> & TestStateAction<State>;

  store[SET_TEST_STATE](initialState);

  return Object.assign(store, {
    setState: (partial: Partial<State>) => store[SET_TEST_STATE](partial),
  }) as unknown as TestPlayerStore<State>;
}
