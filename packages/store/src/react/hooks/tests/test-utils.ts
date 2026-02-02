import { noop } from '@videojs/utils/function';

import { defineSlice } from '../../../core/slice';
import { createStore as createCoreStore } from '../../../core/store';

// Shared mock target for synchronous tests
export class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

// Shared slice for synchronous tests
export const audioSlice = defineSlice<MockMedia>()({
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

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    target.addEventListener('volumechange', sync);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', sync);
    });
  },
});

export function createTestStore() {
  const store = createCoreStore<MockMedia>()(audioSlice);
  const target = new MockMedia();
  store.attach(target);
  return { store, target };
}

// Async mock for testing pending states
export class AsyncMockMedia extends EventTarget {
  volume = 1;
  muted = false;
}

export const asyncAudioSlice = defineSlice<AsyncMockMedia>()({
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

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    target.addEventListener('volumechange', sync);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', sync);
    });
  },
});

export function createAsyncTestStore() {
  const store = createCoreStore<AsyncMockMedia>()(asyncAudioSlice, { onError: noop });

  const target = new AsyncMockMedia();
  store.attach(target);

  return { store, target };
}

/** Slice with custom keys (name !== key) for testing superseding behavior. */
export const customKeySlice = defineSlice<MockMedia>()({
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

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    target.addEventListener('volumechange', sync);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', sync);
    });
  },
});

export function createCustomKeyTestStore() {
  const store = createCoreStore<MockMedia>()(customKeySlice, { onError: noop });

  const target = new MockMedia();
  store.attach(target);

  return { store, target };
}
