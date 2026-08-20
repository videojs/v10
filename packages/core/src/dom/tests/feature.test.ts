import { createSelector, createStore, type StateContext } from '@videojs/store';
import { assertType, describe, expect, it } from 'vitest';
import {
  type ConfigurablePlayerFeatureConfig,
  combinePlayerFeatureConfigs,
  definePlayerFeature,
  setPlayerConfigValue,
} from '../feature';
import type { PlayerFeatureConfig, PlayerTarget } from '../player';

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

  it('defines a configurable player feature', () => {
    const feature = definePlayerFeature(
      {
        name: 'configurable',
        state: (_ctx, config: { enabled: boolean }) => ({ enabled: config.enabled }),
      },
      { enabled: true }
    );

    expect(feature.name).toBe('configurable');
    expect(feature.state(stateContext).enabled).toBe(true);
    expect(feature().state(stateContext).enabled).toBe(true);
    expect(feature({ enabled: false }).state(stateContext).enabled).toBe(false);
    expect(createSelector(feature).displayName).toBe('configurable');
  });

  it('keeps static config declarations out of the legacy feature-factory shape', () => {
    type LegacyConfig = ConfigurablePlayerFeatureConfig<{ enabled: boolean }, { enabled: boolean }>;

    assertType<LegacyConfig>({
      state: (_ctx, config: { enabled: boolean }) => ({ enabled: config.enabled }),
    });
    assertType<LegacyConfig>({
      state: (_ctx, config: { enabled: boolean }) => ({ enabled: config.enabled }),
      // @ts-expect-error Legacy factory config is fixed when the feature is created.
      config: { enabled: true },
    });
  });
});
