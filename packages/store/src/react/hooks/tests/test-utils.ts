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
  state: ({ target }) => ({
    volume: 1,
    muted: false,
    setVolume(volume: number) {
      target().volume = volume;
      target().dispatchEvent(new Event('volumechange'));
      return volume;
    },
    setMuted(muted: boolean) {
      target().muted = muted;
      target().dispatchEvent(new Event('volumechange'));
      return muted;
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
  state: ({ target }) => ({
    volume: 1,
    muted: false,
    async setVolume(volume: number) {
      await Promise.resolve();
      target().volume = volume;
      target().dispatchEvent(new Event('volumechange'));
      return volume;
    },
    async slowSetVolume(volume: number) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      target().volume = volume;
      target().dispatchEvent(new Event('volumechange'));
      return volume;
    },
    async failingRequest() {
      await Promise.resolve();
      throw new Error('Request failed');
    },
    async failingSetVolume() {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error('Test error');
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
