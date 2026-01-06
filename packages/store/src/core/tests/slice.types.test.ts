import type { InferSliceRequests, InferSliceState, Slice } from '../slice';

import { describe, expectTypeOf, it } from 'vitest';

import { createSlice } from '../slice';

interface MockTarget {
  volume: number;
  muted: boolean;
}

describe('slice types', () => {
  describe('createSlice', () => {
    it('returns Slice type with inferred state', () => {
      const slice = createSlice<MockTarget>()({
        initialState: { volume: 1, muted: false },
        getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
        subscribe: () => {},
        request: {},
      });

      expectTypeOf(slice).toExtend<Slice<MockTarget, {
        volume: number;
        muted: boolean;
      }, object>>();
    });

    it('infers request handler types from simple handlers', () => {
      const _slice = createSlice<MockTarget>()({
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

      type Requests = InferSliceRequests<typeof _slice>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');

      expectTypeOf<Requests['setVolume']>().toExtend<{ input: number; output: number }>();
    });

    it('infers async request handler types', () => {
      const _slice = createSlice<MockTarget>()({
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

      type Requests = InferSliceRequests<typeof _slice>;

      expectTypeOf<Requests['asyncSetVolume']>().toExtend<{ input: number; output: number }>();
    });

    it('infers request config with custom key', () => {
      const _slice = createSlice<MockTarget>()({
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

      type Requests = InferSliceRequests<typeof _slice>;

      expectTypeOf<Requests['setVolume']>().toExtend<{ input: number; output: number }>();
      expectTypeOf<Requests['setMuted']>().toExtend<{ input: boolean; output: boolean }>();
    });

    it('infers void input when handler takes no arguments', () => {
      const _slice = createSlice<MockTarget>()({
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

      type Requests = InferSliceRequests<typeof _slice>;

      expectTypeOf<Requests['toggleMute']>().toExtend<{ input: void; output: boolean }>();
    });
  });

  describe('InferSliceState', () => {
    it('extracts state type from slice', () => {
      const _slice = createSlice<MockTarget>()({
        initialState: { volume: 1, muted: false, label: 'test' },
        getSnapshot: ({ initialState }) => initialState,
        subscribe: () => {},
        request: {},
      });

      type State = InferSliceState<typeof _slice>;

      expectTypeOf<State>().toEqualTypeOf<{ volume: number; muted: boolean; label: string }>();
    });
  });

  describe('InferSliceRequests', () => {
    it('extracts request types from slice', () => {
      const _slice = createSlice<MockTarget>()({
        initialState: { volume: 1 },
        getSnapshot: ({ target }) => ({ volume: target.volume }),
        subscribe: () => {},
        request: {
          setVolume: (v: number) => v,
          reset: () => 1,
        },
      });

      type Requests = InferSliceRequests<typeof _slice>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');
      expectTypeOf<Requests>().toHaveProperty('reset');
    });
  });
});
