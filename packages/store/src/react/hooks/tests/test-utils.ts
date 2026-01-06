import { noop } from '@videojs/utils/function';

import { createSlice } from '../../../core/slice';
import { createStore as createCoreStore } from '../../../core/store';

// Shared mock target for synchronous tests
export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

// Shared slice for synchronous tests
export const audioSlice = createSlice<MockMedia>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  subscribe: ({ target, update, signal }) => {
    target.addEventListener('volumechange', update);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', update);
    });
  },
  request: {
    setVolume: (volume: number, { target }) => {
      target.volume = volume;
      target.dispatchEvent(new Event('volumechange'));
      return volume;
    },
    setMuted: (muted: boolean, { target }) => {
      target.muted = muted;
      target.dispatchEvent(new Event('volumechange'));
      return muted;
    },
  },
});

export function createTestStore() {
  const store = createCoreStore({ slices: [audioSlice] });
  const target = new MockMedia();
  store.attach(target);
  return { store, target };
}

// Async mock for testing pending states
export class AsyncMockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

export const asyncAudioSlice = createSlice<AsyncMockMedia>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('volumechange', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', handler);
    });
  },
  request: {
    setVolume: {
      handler: async (volume: number, { target }) => {
        await Promise.resolve();
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
    slowSetVolume: {
      handler: async (volume: number, { target }) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
    failingRequest: {
      handler: async () => {
        await Promise.resolve();
        throw new Error('Request failed');
      },
    },
    failingSetVolume: {
      handler: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Test error');
      },
    },
  },
});

export function createAsyncTestStore() {
  const store = createCoreStore({
    slices: [asyncAudioSlice],
    onError: noop,
  });

  const target = new AsyncMockMedia();
  store.attach(target);

  return { store, target };
}

/** Slice with custom keys (name !== key) for testing superseding behavior. */
export const customKeySlice = createSlice<MockMedia>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('volumechange', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', handler);
    });
  },
  request: {
    // name='adjustVolume', key='audio-settings'
    adjustVolume: {
      key: 'audio-settings',
      handler: async (volume: number, { target }): Promise<number> => {
        await new Promise(resolve => setTimeout(resolve, 20));
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      },
    },
    // name='toggleMute', key='audio-settings' (same key - will supersede adjustVolume)
    toggleMute: {
      key: 'audio-settings',
      handler: async (muted: boolean, { target }): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 20));
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      },
    },
  },
});

export function createCustomKeyTestStore() {
  const store = createCoreStore({
    slices: [customKeySlice],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}
