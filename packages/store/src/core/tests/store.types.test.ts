import { describe, expectTypeOf, it } from 'vitest';
import { createFeature } from '../feature';
import type { InferStoreRequests, InferStoreState, InferStoreTarget } from '../store';
import { createStore } from '../store';

interface MockTarget {
  volume: number;
  muted: boolean;
}

const audioFeature = createFeature<MockTarget>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
  subscribe: () => {},
  request: {
    setVolume: (volume: number, { target }) => {
      target.volume = volume;
      return volume;
    },
    setMuted: (muted: boolean, { target }) => {
      target.muted = muted;
      return muted;
    },
  },
});

const playbackFeature = createFeature<MockTarget>()({
  initialState: { playing: false },
  getSnapshot: () => ({ playing: false }),
  subscribe: () => {},
  request: {
    play: () => true,
    pause: () => false,
  },
});

function createTestStore() {
  return createStore({ features: [audioFeature, playbackFeature] });
}

function createSingleFeatureStore() {
  return createStore({ features: [audioFeature] });
}

describe('store types', () => {
  describe('createStore', () => {
    it('state has union of all feature states', () => {
      const store = createTestStore();

      expectTypeOf(store.state.volume).toEqualTypeOf<number>();
      expectTypeOf(store.state.muted).toEqualTypeOf<boolean>();
      expectTypeOf(store.state.playing).toEqualTypeOf<boolean>();
    });

    it('request has union of all feature requests', () => {
      const store = createTestStore();

      expectTypeOf(store.request).toHaveProperty('setVolume');
      expectTypeOf(store.request).toHaveProperty('setMuted');
      expectTypeOf(store.request).toHaveProperty('play');
      expectTypeOf(store.request).toHaveProperty('pause');
    });

    it('request methods have correct signatures', () => {
      const store = createSingleFeatureStore();

      expectTypeOf(store.request.setVolume).toBeFunction();
      expectTypeOf(store.request.setVolume).parameter(0).toEqualTypeOf<number>();
      expectTypeOf(store.request.setVolume).returns.toEqualTypeOf<Promise<number>>();

      expectTypeOf(store.request.setMuted).toBeFunction();
      expectTypeOf(store.request.setMuted).parameter(0).toEqualTypeOf<boolean>();
      expectTypeOf(store.request.setMuted).returns.toEqualTypeOf<Promise<boolean>>();
    });

    it('target is nullable before attach', () => {
      const store = createSingleFeatureStore();

      expectTypeOf(store.target).toEqualTypeOf<MockTarget | null>();
    });
  });

  describe('InferStoreTarget', () => {
    it('extracts target type from store', () => {
      const _store = createSingleFeatureStore();
      type Target = InferStoreTarget<typeof _store>;
      const _target: Target = {} as Target;

      expectTypeOf(_target).toEqualTypeOf<MockTarget>();
    });
  });

  describe('InferStoreState', () => {
    it('extracts state type from store', () => {
      const _store = createTestStore();
      type State = InferStoreState<typeof _store>;
      const _state: State = {} as State;

      expectTypeOf(_state.volume).toEqualTypeOf<number>();
      expectTypeOf(_state.muted).toEqualTypeOf<boolean>();
      expectTypeOf(_state.playing).toEqualTypeOf<boolean>();
    });
  });

  describe('InferStoreRequests', () => {
    it('extracts request types from store', () => {
      const _store = createSingleFeatureStore();
      type Requests = InferStoreRequests<typeof _store>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');
      expectTypeOf<Requests>().toHaveProperty('setMuted');
    });
  });

  describe('subscribe', () => {
    it('state returns readonly snapshot', () => {
      const store = createSingleFeatureStore();

      expectTypeOf(store.state).toBeObject();
      expectTypeOf(store.subscribe).toBeFunction();
    });

    it('state properties have correct types', () => {
      const store = createSingleFeatureStore();

      expectTypeOf(store.state.volume).toEqualTypeOf<number>();
      expectTypeOf(store.state.muted).toEqualTypeOf<boolean>();
    });
  });
});
