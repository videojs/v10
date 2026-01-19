import type { Queue, TasksRecord } from '../queue';
import type { InferStoreRequests, InferStoreState, InferStoreTarget, InferStoreTasks } from '../store';

import { describe, expectTypeOf, it } from 'vitest';

import { createSlice } from '../slice';
import { createStore } from '../store';

interface MockTarget {
  volume: number;
  muted: boolean;
}

const audioSlice = createSlice<MockTarget>()({
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

const playbackSlice = createSlice<MockTarget>()({
  initialState: { playing: false },
  getSnapshot: () => ({ playing: false }),
  subscribe: () => {},
  request: {
    play: () => true,
    pause: () => false,
  },
});

function createTestStore() {
  return createStore({ slices: [audioSlice, playbackSlice] });
}

function createSingleSliceStore() {
  return createStore({ slices: [audioSlice] });
}

describe('store types', () => {
  describe('createStore', () => {
    it('state has union of all slice states', () => {
      const store = createTestStore();

      expectTypeOf(store.state.volume).toEqualTypeOf<number>();
      expectTypeOf(store.state.muted).toEqualTypeOf<boolean>();
      expectTypeOf(store.state.playing).toEqualTypeOf<boolean>();
    });

    it('request has union of all slice requests', () => {
      const store = createTestStore();

      expectTypeOf(store.request).toHaveProperty('setVolume');
      expectTypeOf(store.request).toHaveProperty('setMuted');
      expectTypeOf(store.request).toHaveProperty('play');
      expectTypeOf(store.request).toHaveProperty('pause');
    });

    it('request methods have correct signatures', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.request.setVolume).toBeFunction();
      expectTypeOf(store.request.setVolume).parameter(0).toEqualTypeOf<number>();
      expectTypeOf(store.request.setVolume).returns.toEqualTypeOf<Promise<number>>();

      expectTypeOf(store.request.setMuted).toBeFunction();
      expectTypeOf(store.request.setMuted).parameter(0).toEqualTypeOf<boolean>();
      expectTypeOf(store.request.setMuted).returns.toEqualTypeOf<Promise<boolean>>();
    });

    it('queue has correctly typed tasks', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.queue).toExtend<Queue<any>>();
      expectTypeOf(store.queue.tasks).toExtend<TasksRecord<any>>();
    });

    it('target is nullable before attach', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.target).toEqualTypeOf<MockTarget | null>();
    });
  });

  describe('InferStoreTarget', () => {
    it('extracts target type from store', () => {
      const _store = createSingleSliceStore();
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
      const _store = createSingleSliceStore();
      type Requests = InferStoreRequests<typeof _store>;

      expectTypeOf<Requests>().toHaveProperty('setVolume');
      expectTypeOf<Requests>().toHaveProperty('setMuted');
    });
  });

  describe('InferStoreTasks', () => {
    it('extracts task types from store', () => {
      const _store = createSingleSliceStore();
      type Tasks = InferStoreTasks<typeof _store>;

      expectTypeOf<Tasks>().toHaveProperty('setVolume');
      expectTypeOf<Tasks>().toHaveProperty('setMuted');
    });
  });

  describe('subscribe', () => {
    it('state is a reactive proxy', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.state).toEqualTypeOf<{ volume: number; muted: boolean }>();
    });

    it('state properties have correct types', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.state.volume).toEqualTypeOf<number>();
      expectTypeOf(store.state.muted).toEqualTypeOf<boolean>();
    });
  });

  describe('store queue integration types', () => {
    it('queue.tasks has keys matching request names', () => {
      const store = createSingleSliceStore();

      expectTypeOf(store.queue.tasks).toHaveProperty('setVolume');
      expectTypeOf(store.queue.tasks).toHaveProperty('setMuted');
    });

    it('task input type matches request parameter', () => {
      const store = createSingleSliceStore();
      const task = store.queue.tasks.setVolume;

      if (task) {
        expectTypeOf(task.input).toEqualTypeOf<number>();
      }
    });

    it('task output type matches request return on success', () => {
      const store = createSingleSliceStore();
      const task = store.queue.tasks.setVolume;

      if (task?.status === 'success') {
        expectTypeOf(task.output).toEqualTypeOf<number>();
      }
    });

    it('multi-slice store has combined queue task types', () => {
      const store = createTestStore();

      expectTypeOf(store.queue.tasks).toHaveProperty('setVolume');
      expectTypeOf(store.queue.tasks).toHaveProperty('setMuted');
      expectTypeOf(store.queue.tasks).toHaveProperty('play');
      expectTypeOf(store.queue.tasks).toHaveProperty('pause');
    });

    it('queue.reset accepts request names', () => {
      const store = createSingleSliceStore();

      store.queue.reset('setVolume');
      store.queue.reset('setMuted');
      store.queue.reset(); // all
    });

    it('queue.abort accepts request names', () => {
      const store = createSingleSliceStore();

      store.queue.abort('setVolume');
      store.queue.abort('setMuted');
      store.queue.abort(); // all
    });

    it('InferStoreTasks matches queue task record keys', () => {
      const _store = createSingleSliceStore();
      type Tasks = InferStoreTasks<typeof _store>;

      expectTypeOf<Tasks>().toHaveProperty('setVolume');
      expectTypeOf<Tasks>().toHaveProperty('setMuted');
    });
  });
});
