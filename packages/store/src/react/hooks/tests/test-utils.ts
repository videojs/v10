import { noop } from '@videojs/utils/function';

import { defineFeature } from '../../../core/feature';
import { createStore as createCoreStore } from '../../../core/store';

// Shared mock target for synchronous tests
export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

// Shared feature for synchronous tests
export const audioFeature = defineFeature<MockMedia>()({
  state: ({ task }) => ({
    volume: 1,
    muted: false,
    setVolume(volume: number) {
      return task(({ target }) => {
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      });
    },
    setMuted(muted: boolean) {
      return task(({ target }) => {
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      });
    },
  }),
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
});

export function createTestStore() {
  const store = createCoreStore({ features: [audioFeature] });
  const target = new MockMedia();
  store.attach(target);
  return { store, target };
}

// Async mock for testing pending states
export class AsyncMockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

export const asyncAudioFeature = defineFeature<AsyncMockMedia>()({
  state: ({ task }) => ({
    volume: 1,
    muted: false,
    setVolume(volume: number) {
      return task(async ({ target }) => {
        await Promise.resolve();
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      });
    },
    slowSetVolume(volume: number) {
      return task(async ({ target }) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        target.volume = volume;
        target.dispatchEvent(new Event('volumechange'));
        return volume;
      });
    },
    failingRequest() {
      return task(async () => {
        await Promise.resolve();
        throw new Error('Request failed');
      });
    },
    failingSetVolume() {
      return task(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Test error');
      });
    },
  }),
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
});

export function createAsyncTestStore() {
  const store = createCoreStore({
    features: [asyncAudioFeature],
    onError: noop,
  });

  const target = new AsyncMockMedia();
  store.attach(target);

  return { store, target };
}

/** Feature with custom keys (name !== key) for testing superseding behavior. */
export const customKeyFeature = defineFeature<MockMedia>()({
  state: ({ task }) => ({
    volume: 1,
    muted: false,
    // name='adjustVolume', key='audio-settings'
    adjustVolume(volume: number) {
      return task({
        key: 'audio-settings',
        async handler({ target }) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          target.volume = volume;
          target.dispatchEvent(new Event('volumechange'));
          return volume;
        },
      });
    },
    // name='toggleMute', key='audio-settings' (same key - will supersede adjustVolume)
    toggleMute(muted: boolean) {
      return task({
        key: 'audio-settings',
        async handler({ target }) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          target.muted = muted;
          target.dispatchEvent(new Event('volumechange'));
          return muted;
        },
      });
    },
  }),
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
});

export function createCustomKeyTestStore() {
  const store = createCoreStore({
    features: [customKeyFeature],
    onError: noop,
  });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}
