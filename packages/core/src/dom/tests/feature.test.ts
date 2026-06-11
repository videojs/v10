import { createSelector, type StateContext } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import { definePlayerFeature } from '../feature';
import type { PlayerTarget } from '../media/types';

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
});
