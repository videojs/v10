import { describe, expectTypeOf, it } from 'vitest';
import type { Feature, InferFeatureRequests, InferFeatureState } from '../feature';

import { createFeature } from '../feature';

interface MockTarget {
  volume: number;
  muted: boolean;
}

describe('feature types', () => {
  describe('createFeature', () => {
    it('returns Feature type with inferred state', () => {
      const feature = createFeature<MockTarget>()({
        initialState: { volume: 1, muted: false },
        getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
        subscribe: () => {},
        request: {},
      });

      expectTypeOf(feature).toExtend<
        Feature<
          MockTarget,
          {
            volume: number;
            muted: boolean;
          },
          object
        >
      >();
    });

    it('infers request handler types from simple handlers', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { volume: 1 },
        getSnapshot: ({ target }) => ({ volume: target.volume }),
        subscribe: () => {},
        request: {
          setVolume: (volume: number, { target }) => {
            target.volume = volume;
            return volume;
          },
        },
      });

      type Requests = InferFeatureRequests<typeof _feature>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');

      expectTypeOf<Requests['setVolume']>().toExtend<{ input: number; output: number }>();
    });

    it('infers async request handler types', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { volume: 1 },
        getSnapshot: ({ target }) => ({ volume: target.volume }),
        subscribe: () => {},
        request: {
          asyncSetVolume: async (volume: number, { target }): Promise<number> => {
            target.volume = volume;
            return volume;
          },
        },
      });

      type Requests = InferFeatureRequests<typeof _feature>;

      expectTypeOf<Requests['asyncSetVolume']>().toExtend<{ input: number; output: number }>();
    });

    it('infers request config with custom key', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { volume: 1, muted: false },
        getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
        subscribe: () => {},
        request: {
          setVolume: {
            key: 'audio',
            handler: (volume: number, { target }) => {
              target.volume = volume;
              return volume;
            },
          },
          setMuted: {
            key: 'audio',
            handler: (muted: boolean, { target }) => {
              target.muted = muted;
              return muted;
            },
          },
        },
      });

      type Requests = InferFeatureRequests<typeof _feature>;

      expectTypeOf<Requests['setVolume']>().toExtend<{ input: number; output: number }>();
      expectTypeOf<Requests['setMuted']>().toExtend<{ input: boolean; output: boolean }>();
    });

    it('infers void input when handler takes no arguments', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { muted: false },
        getSnapshot: ({ target }) => ({ muted: target.muted }),
        subscribe: () => {},
        request: {
          toggleMute: ({ target }) => {
            target.muted = !target.muted;
            return target.muted;
          },
        },
      });

      type Requests = InferFeatureRequests<typeof _feature>;

      expectTypeOf<Requests['toggleMute']>().toExtend<{ input: void; output: boolean }>();
    });
  });

  describe('InferFeatureState', () => {
    it('extracts state type from feature', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { volume: 1, muted: false, label: 'test' },
        getSnapshot: ({ initialState }) => initialState,
        subscribe: () => {},
        request: {},
      });

      type State = InferFeatureState<typeof _feature>;

      expectTypeOf<State>().toEqualTypeOf<{ volume: number; muted: boolean; label: string }>();
    });
  });

  describe('InferFeatureRequests', () => {
    it('extracts request types from feature', () => {
      const _feature = createFeature<MockTarget>()({
        initialState: { volume: 1 },
        getSnapshot: ({ target }) => ({ volume: target.volume }),
        subscribe: () => {},
        request: {
          setVolume: (v: number) => v,
          reset: () => 1,
        },
      });

      type Requests = InferFeatureRequests<typeof _feature>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');
      expectTypeOf<Requests>().toHaveProperty('reset');
    });
  });
});
