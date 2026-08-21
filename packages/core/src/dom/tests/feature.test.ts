import { createSelector, createStore, type StateContext } from '@videojs/store';
import { assertType, describe, expect, it, vi } from 'vitest';
import {
  combinePlayerFeatureConfigs,
  combinePlayerFeatures,
  definePlayerFeature,
  setPlayerConfigValue,
} from '../feature';
import type { AnyPlayerFeature, PlayerFeatureConfig, PlayerTarget } from '../player';

const stateContext = {
  target: () => {
    throw new Error('Target is not available in this test.');
  },
  signals: undefined as unknown as StateContext<PlayerTarget>['signals'],
  get: () => ({}),
  set: () => {},
} satisfies StateContext<PlayerTarget>;

describe('definePlayerFeature', () => {
  it('defines a plain player feature', () => {
    const feature = definePlayerFeature({
      name: 'plain',
      state: () => ({ enabled: true }),
    });

    expect(feature.name).toBe('plain');
    expect(feature.state(stateContext).enabled).toBe(true);
  });

  it('routes config inputs through private actions and derives detach persistence', () => {
    const USER_LABEL = Symbol('userLabel');
    const SET_USER_LABEL = Symbol('setUserLabel');

    interface SourceState {
      [USER_LABEL]: string | null | undefined;
      [SET_USER_LABEL](value: string | null | undefined): void;
    }

    const feature = definePlayerFeature({
      config: {
        label: {
          action: SET_USER_LABEL,
          state: USER_LABEL,
        },
      } satisfies PlayerFeatureConfig<SourceState>,
      state: ({ set }): SourceState => ({
        [USER_LABEL]: undefined,
        [SET_USER_LABEL]: (value) => set({ [USER_LABEL]: value }),
      }),
      derived: {
        label: ({ get }) => get()[USER_LABEL] ?? 'fallback',
      },
    });

    expect(feature.preserve).toEqual([USER_LABEL]);
    expect(combinePlayerFeatureConfigs([feature])).toEqual(feature.config);

    const store = createStore<PlayerTarget>()(feature);
    setPlayerConfigValue(store, feature.config!.label, 'provided');
    const detach = store.attach({} as PlayerTarget);
    detach();

    expect(store.label).toBe('provided');

    const UNKNOWN = Symbol('unknown');

    assertType<PlayerFeatureConfig<SourceState>>({
      label: {
        // @ts-expect-error Config actions must exist in the feature's source state.
        action: UNKNOWN,
        state: USER_LABEL,
      },
    });
    assertType<PlayerFeatureConfig<SourceState>>({
      label: {
        action: SET_USER_LABEL,
        // @ts-expect-error Config state must exist in the feature's source state.
        state: UNKNOWN,
      },
    });

    interface RequiredLabelState {
      [USER_LABEL]: string;
      [SET_USER_LABEL](value: string): void;
    }

    assertType<PlayerFeatureConfig<RequiredLabelState>>({
      label: {
        // @ts-expect-error Config actions must accept null and undefined when the input is absent.
        action: SET_USER_LABEL,
        state: USER_LABEL,
      },
    });
  });

  it('accepts config actions narrower than string', () => {
    type Size = 'small' | 'large';

    interface EnumState {
      size: Size;
      setSize(value: Size | null | undefined): void;
    }

    const feature = definePlayerFeature({
      name: 'enum',
      config: {
        size: {
          action: 'setSize',
          state: 'size',
        },
      } satisfies PlayerFeatureConfig<EnumState>,
      state: ({ set }): EnumState => ({
        size: 'small',
        setSize: (value) => set({ size: value ?? 'small' }),
      }),
    });

    const store = createStore<PlayerTarget>()(feature);
    setPlayerConfigValue(store, feature.config!.size, 'large');

    expect(store.size).toBe('large');
    expect(createSelector(feature).displayName).toBe('enum');

    interface WidenedState {
      size: Size;
      setSize(value: Size): void;
    }

    assertType<PlayerFeatureConfig<WidenedState>>({
      size: {
        // @ts-expect-error Config actions must still accept null and undefined.
        action: 'setSize',
        state: 'size',
      },
    });
  });
});

describe('combinePlayerFeatures', () => {
  it('defers each state factory until store creation and calls it once', () => {
    const firstState = vi.fn(() => ({ first: 1 }));
    const secondState = vi.fn(({ set }: StateContext<PlayerTarget>) => ({
      label: '',
      setLabel: (value: string | null | undefined) => set({ label: value ?? '' }),
    }));
    const first = definePlayerFeature({
      name: 'first',
      state: firstState,
      derived: {
        doubled: ({ get }) => get().first * 2,
      },
    });
    const second = definePlayerFeature({
      name: 'second',
      config: {
        label: {
          action: 'setLabel',
          state: 'label',
        },
      } satisfies PlayerFeatureConfig<{
        label: string;
        setLabel(value: string | null | undefined): void;
      }>,
      state: secondState,
    });

    const { slice, config } = combinePlayerFeatures([first, second]);

    expect(firstState).not.toHaveBeenCalled();
    expect(secondState).not.toHaveBeenCalled();

    const store = createStore<PlayerTarget>()(slice);

    expect(firstState).toHaveBeenCalledOnce();
    expect(secondState).toHaveBeenCalledOnce();
    expect(store.state).toMatchObject({ first: 1, doubled: 2, label: '' });
    expect(config).toEqual(second.config);
  });

  it('snapshots the selected features before deferred state initialization', () => {
    const firstState = vi.fn(() => ({ count: 2 }));
    const firstAttach = vi.fn();
    const secondAttach = vi.fn();
    const replacementState = vi.fn(() => ({ replacement: true }));
    const replacementAttach = vi.fn();
    const first = definePlayerFeature({
      name: 'first',
      config: {
        label: { action: 'setLabel', state: 'label' },
      },
      state: ({
        set,
      }): {
        count: number;
        label: string;
        setLabel(value: string | null | undefined): void;
      } => ({
        ...firstState(),
        label: '',
        setLabel: (value) => set({ label: value ?? '' }),
      }),
      derived: {
        doubled: ({ get }) => get().count * 2,
      },
      attach: firstAttach,
    });
    const second = definePlayerFeature({
      name: 'second',
      state: () => ({ enabled: true }),
      attach: secondAttach,
    });
    const replacement = definePlayerFeature({
      name: 'replacement',
      config: {
        replacement: { action: 'setReplacement', state: 'replacement' },
      },
      state: ({ set }) => ({
        ...replacementState(),
        setReplacement: (value: string | null | undefined) => set({ replacement: value }),
      }),
      derived: {
        replaced: () => true,
      },
      attach: replacementAttach,
    });
    const selected: AnyPlayerFeature[] = [first, second];
    const { slice, config } = combinePlayerFeatures(selected);

    selected.splice(0, selected.length, replacement);

    const store = createStore<PlayerTarget>()(slice);
    store.attach({} as PlayerTarget);

    expect(store.state).toMatchObject({ count: 2, doubled: 4, enabled: true, label: '' });
    expect(store.state).not.toHaveProperty('replacement');
    expect(store.state).not.toHaveProperty('replaced');
    expect(config).toEqual(first.config);
    expect(firstState).toHaveBeenCalledOnce();
    expect(replacementState).not.toHaveBeenCalled();
    expect(firstAttach).toHaveBeenCalledOnce();
    expect(secondAttach).toHaveBeenCalledOnce();
    expect(replacementAttach).not.toHaveBeenCalled();
  });

  it('uses the selected feature snapshot in deferred collision diagnostics', () => {
    const first = definePlayerFeature({
      name: 'first',
      state: () => ({ shared: 1 }),
    });
    const second = definePlayerFeature({
      name: 'second',
      state: () => ({ shared: 2 }),
    });
    const replacement = definePlayerFeature({
      name: 'replacement',
      state: () => ({ replacement: true }),
    });
    const selected: AnyPlayerFeature[] = [first, second];
    const { slice } = combinePlayerFeatures(selected);

    selected.splice(0, selected.length, replacement);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(/key "shared".*feature "first".*feature "second"/);
  });

  it('snapshots derived keys and their owners before deferred state initialization', () => {
    const source = definePlayerFeature({
      name: 'source',
      state: () => ({ shared: 1 }),
    });
    const derived = definePlayerFeature({
      name: 'derived',
      state: () => ({ input: 2 }),
      derived: { shared: ({ get }) => get().input },
    });
    const { slice } = combinePlayerFeatures([source, derived]);

    (derived as AnyPlayerFeature).derived = {};
    (derived as AnyPlayerFeature).name = 'renamed';

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(/key "shared".*feature "source".*feature "derived"/);
  });

  it('rejects source state collisions', () => {
    const first = definePlayerFeature({
      name: 'first',
      state: () => ({ shared: 1 }),
    });
    const second = definePlayerFeature({
      name: 'second',
      state: () => ({ shared: 2 }),
    });
    const { slice } = combinePlayerFeatures([first, second]);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(
      '[vjs-core] Cannot compose player features: key "shared" conflicts between namespace "source state" owned by feature "first" (#1) and namespace "source state" owned by feature "second" (#2).'
    );
  });

  it('rejects derived state collisions', () => {
    const first = definePlayerFeature({
      name: 'first',
      state: () => ({ first: 1 }),
      derived: { shared: () => 1 },
    });
    const second = definePlayerFeature({
      name: 'second',
      state: () => ({ second: 2 }),
      derived: { shared: () => 2 },
    });
    const { slice } = combinePlayerFeatures([first, second]);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(
      /key "shared" conflicts between namespace "derived state" owned by feature "first" \(#1\) and namespace "derived state" owned by feature "second" \(#2\)/
    );
  });

  it('rejects source and derived state collisions across features', () => {
    const source = definePlayerFeature({
      name: 'source',
      state: () => ({ shared: 1 }),
    });
    const derived = definePlayerFeature({
      name: 'derived',
      state: () => ({ input: 2 }),
      derived: { shared: ({ get }) => get().input },
    });
    const { slice } = combinePlayerFeatures([source, derived]);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(
      /key "shared" conflicts between namespace "source state" owned by feature "source" \(#1\) and namespace "derived state" owned by feature "derived" \(#2\)/
    );
  });

  it('rejects source and derived state collisions within one feature', () => {
    const feature = definePlayerFeature({
      name: 'overlapping',
      state: () => ({ shared: 1 }),
      derived: { shared: ({ get }) => get().shared + 1 },
    });
    const { slice } = combinePlayerFeatures([feature]);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(
      /key "shared" conflicts between namespace "source state" owned by feature "overlapping" \(#1\) and namespace "derived state" owned by feature "overlapping" \(#1\)/
    );
  });

  it('rejects configuration collisions', () => {
    const first = definePlayerFeature({
      name: 'first',
      config: { shared: { action: 'setFirst', state: 'first' } },
      state: ({ set }) => ({
        first: '',
        setFirst: (value: string | null | undefined) => set({ first: value ?? '' }),
      }),
    });
    const second = definePlayerFeature({
      name: 'second',
      config: { shared: { action: 'setSecond', state: 'second' } },
      state: ({ set }) => ({
        second: '',
        setSecond: (value: string | null | undefined) => set({ second: value ?? '' }),
      }),
    });

    expect(() => combinePlayerFeatures([first, second])).toThrowError(
      /key "shared" conflicts between namespace "config" owned by feature "first" \(#1\) and namespace "config" owned by feature "second" \(#2\)/
    );
  });

  it('compares symbol keys by identity and formats anonymous owners', () => {
    const shared = Symbol('shared');
    const first = definePlayerFeature({
      state: () => ({ [shared]: 1 }),
    });
    const second = definePlayerFeature({
      state: () => ({ [shared]: 2 }),
    });
    const { slice } = combinePlayerFeatures([first, second]);

    expect(() => createStore<PlayerTarget>()(slice)).toThrowError(
      /key Symbol\(shared\).*anonymous feature #1.*anonymous feature #2/
    );

    const distinct = combinePlayerFeatures([
      definePlayerFeature({ state: () => ({ [Symbol('shared')]: 1 }) }),
      definePlayerFeature({ state: () => ({ [Symbol('shared')]: 2 }) }),
    ]);

    expect(() => createStore<PlayerTarget>()(distinct.slice)).not.toThrow();
  });

  it('ignores non-enumerable source, derived, and configuration keys', () => {
    const hiddenSource = Symbol('hidden-source');
    const firstState = { first: 1 };
    const secondState = { second: 2 };
    Object.defineProperties(firstState, {
      hidden: { value: 1 },
      [hiddenSource]: { value: 1 },
    });
    Object.defineProperties(secondState, {
      hidden: { value: 2 },
      [hiddenSource]: { value: 2 },
    });

    const hiddenDerived = {} as Record<string, () => number>;
    Object.defineProperty(hiddenDerived, 'first', { value: () => 2 });

    const hiddenConfig = {} as PlayerFeatureConfig;
    Object.defineProperty(hiddenConfig, 'label', {
      value: { action: 'setLabel', state: 'label' },
    });

    const { slice, config } = combinePlayerFeatures([
      definePlayerFeature({
        state: () => firstState,
      }),
      definePlayerFeature({
        config: hiddenConfig,
        state: () => secondState,
        derived: hiddenDerived,
      }),
      definePlayerFeature({
        config: {
          label: { action: 'setLabel', state: 'label' },
        },
        state: ({ set }) => ({
          label: '',
          setLabel: (value: string | null | undefined) => set({ label: value ?? '' }),
        }),
      }),
    ]);

    const store = createStore<PlayerTarget>()(slice);

    expect(store.state).toMatchObject({ first: 1, second: 2, label: '' });
    expect(Object.getOwnPropertySymbols(store.state)).toEqual([]);
    expect(config).toEqual({
      label: { action: 'setLabel', state: 'label' },
    });
  });
});

describe('combinePlayerFeatureConfigs', () => {
  it('keeps legacy last-wins behavior and warns in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = definePlayerFeature({
      config: { shared: { action: 'setFirst', state: 'first' } },
      state: () => ({ first: '', setFirst: () => {} }),
    });
    const second = definePlayerFeature({
      config: { shared: { action: 'setSecond', state: 'second' } },
      state: () => ({ second: '', setSecond: () => {} }),
    });

    expect(combinePlayerFeatureConfigs([first, second])).toEqual(second.config);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate config key "shared"'));

    warn.mockRestore();
  });

  it('does not evaluate state factories', () => {
    const feature = definePlayerFeature({
      config: {
        label: {
          action: 'setLabel',
          state: 'label',
        },
      } satisfies PlayerFeatureConfig<{
        label: string;
        setLabel(value: string | null | undefined): void;
      }>,
      state: (): {
        label: string;
        setLabel(value: string | null | undefined): void;
      } => {
        throw new Error('state should not be evaluated');
      },
    });

    expect(combinePlayerFeatureConfigs([feature])).toEqual(feature.config);
  });
});
