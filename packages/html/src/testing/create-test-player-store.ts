import type { AnyPlayerFeature, AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import type { AnySlice, StateContext, Store, UnionSliceState } from '@videojs/store';
import { combine, createStore } from '@videojs/store';

const SET_TEST_STATE = Symbol('setTestPlayerState');
const TEST_TARGET = {} as PlayerTarget;

type TestState<Features extends readonly AnyPlayerFeature[]> = UnionSliceState<Features>;

interface TestStateAction<State extends object> {
  [SET_TEST_STATE](partial: Partial<State>): void;
}

export type TestPlayerStore<State extends object> = AnyPlayerStore & {
  setState(partial: Partial<State>): void;
};

/**
 * Creates a reactive player store for HTML component tests from the real
 * feature definitions while allowing their initial state to be overridden.
 */
export function createTestPlayerStore<const Features extends readonly AnyPlayerFeature[]>(
  features: Features,
  initialState: Partial<TestState<Features>> = {}
): TestPlayerStore<TestState<Features>> {
  type State = TestState<Features>;

  const testStateFeature = {
    name: 'testState',
    state: ({ set }: StateContext<PlayerTarget>): TestStateAction<State> => ({
      [SET_TEST_STATE]: (partial) => set(partial),
    }),
  };
  const source = createStore<PlayerTarget>()(
    combine(...features, testStateFeature) as AnySlice<PlayerTarget>
  ) as unknown as Store<PlayerTarget, State> & TestStateAction<State>;

  source[SET_TEST_STATE](initialState);

  return Object.create(source, {
    target: { get: () => source.target ?? TEST_TARGET },
    setState: {
      value: (partial: Partial<State>) => source[SET_TEST_STATE](partial),
    },
  }) as TestPlayerStore<State>;
}
