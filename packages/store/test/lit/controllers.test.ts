import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PendingController } from '../../src/lit/pending-controller';
import { SliceController } from '../../src/lit/slice-controller';
import { StoreController } from '../../src/lit/store-controller';
import { createSlice } from '../../src/slice';
import { createStore } from '../../src/store';

// ----------------------------------------
// Mock Host
// ----------------------------------------

class MockHost implements ReactiveControllerHost {
  controllers: ReactiveController[] = [];
  updateCount = 0;

  addController(controller: ReactiveController): void {
    this.controllers.push(controller);
  }

  removeController(controller: ReactiveController): void {
    const index = this.controllers.indexOf(controller);
    if (index >= 0) {
      this.controllers.splice(index, 1);
    }
  }

  requestUpdate(): void {
    this.updateCount++;
  }

  get updateComplete(): Promise<boolean> {
    return Promise.resolve(true);
  }

  // Simulate lifecycle
  connect(): void {
    for (const controller of this.controllers) {
      controller.hostConnected?.();
    }
  }

  disconnect(): void {
    for (const controller of this.controllers) {
      controller.hostDisconnected?.();
    }
  }
}

// ----------------------------------------
// Mock Target & Slices
// ----------------------------------------

class MockMedia extends EventTarget {
  volume = 1;
  muted = false;
  paused = true;
}

const audioSlice = createSlice<MockMedia>()({
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
    setVolume: (volume: number, { target }) => {
      target.volume = volume;
      target.dispatchEvent(new Event('volumechange'));
    },
    setMuted: (muted: boolean, { target }) => {
      target.muted = muted;
      target.dispatchEvent(new Event('volumechange'));
    },
  },
});

const playbackSlice = createSlice<MockMedia>()({
  initialState: { paused: true },
  getSnapshot: ({ target }) => ({ paused: target.paused }),
  subscribe: ({ target, update, signal }) => {
    const handler = () => update();
    target.addEventListener('play', handler);
    target.addEventListener('pause', handler);
    signal.addEventListener('abort', () => {
      target.removeEventListener('play', handler);
      target.removeEventListener('pause', handler);
    });
  },
  request: {
    play: {
      key: 'playback',
      async handler(_, { target }) {
        await new Promise(r => setTimeout(r, 10));
        target.paused = false;
        target.dispatchEvent(new Event('play'));
      },
    },
    pause: {
      key: 'playback',
      async handler(_, { target }) {
        await new Promise(r => setTimeout(r, 10));
        target.paused = true;
        target.dispatchEvent(new Event('pause'));
      },
    },
  },
});

// ----------------------------------------
// StoreController Tests
// ----------------------------------------

describe('storeController', () => {
  let host: MockHost;
  let store: ReturnType<typeof createStore<[typeof audioSlice, typeof playbackSlice]>>;
  let media: MockMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    host = new MockHost();
    store = createStore({ slices: [audioSlice, playbackSlice] });
    media = new MockMedia();
    store.attach(media);
  });

  afterEach(() => {
    vi.useRealTimers();
    store.destroy();
  });

  it('registers itself with the host', () => {
    const controller = new StoreController(host, store);

    expect(host.controllers).toContain(controller);
  });

  it('provides initial state value', () => {
    const controller = new StoreController(host, store);

    expect(controller.value).toEqual({
      volume: 1,
      muted: false,
      paused: true,
    });
  });

  it('exposes the store instance', () => {
    const controller = new StoreController(host, store);

    expect(controller.store).toBe(store);
  });

  it('subscribes on hostConnected', async () => {
    const controller = new StoreController(host, store);
    host.connect();

    await store.request.setVolume(0.5);
    await vi.runAllTimersAsync();

    expect(controller.value.volume).toBe(0.5);
    expect(host.updateCount).toBeGreaterThan(0);
  });

  it('unsubscribes on hostDisconnected', async () => {
    const _controller = new StoreController(host, store);
    host.connect();
    host.disconnect();

    const previousCount = host.updateCount;
    await store.request.setVolume(0.3);
    await vi.runAllTimersAsync();

    expect(host.updateCount).toBe(previousCount);
  });

  describe('with selector', () => {
    it('selects specific state', () => {
      const controller = new StoreController(host, store, state => state.volume);

      expect(controller.value).toBe(1);
    });

    it('only subscribes to selected keys when selector returns object', async () => {
      // Selector returns object with 'volume' key - subscribes only to 'volume'
      const controller = new StoreController(host, store, state => ({ volume: state.volume }));
      host.connect();

      const initialCount = host.updateCount;

      // Change muted (not volume) - should not trigger update
      await store.request.setMuted(true);
      await vi.runAllTimersAsync();

      expect(host.updateCount).toBe(initialCount);

      // Change volume - should trigger update
      await store.request.setVolume(0.5);
      await vi.runAllTimersAsync();

      expect(controller.value).toEqual({ volume: 0.5 });
      expect(host.updateCount).toBeGreaterThan(initialCount);
    });

    it('uses Object.is for equality', async () => {
      // Selector that returns same object reference
      const obj = { id: 1 };
      const _controller = new StoreController(host, store, () => obj);
      host.connect();

      const initialCount = host.updateCount;

      // Trigger state change
      await store.request.setVolume(0.5);
      await vi.runAllTimersAsync();

      // Should not update since Object.is(obj, obj) is true
      expect(host.updateCount).toBe(initialCount);
    });
  });
});

// ----------------------------------------
// SliceController Tests
// ----------------------------------------

describe('sliceController', () => {
  let host: MockHost;
  let store: ReturnType<typeof createStore<[typeof audioSlice, typeof playbackSlice]>>;
  let media: MockMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    host = new MockHost();
    store = createStore({ slices: [audioSlice, playbackSlice] });
    media = new MockMedia();
    store.attach(media);
  });

  afterEach(() => {
    vi.useRealTimers();
    store.destroy();
  });

  it('provides slice state', () => {
    const controller = new SliceController(host, store, audioSlice);

    expect(controller.value).toEqual({
      volume: 1,
      muted: false,
    });
  });

  it('exposes the store and slice', () => {
    const controller = new SliceController(host, store, audioSlice);

    expect(controller.store).toBe(store);
    expect(controller.slice).toBe(audioSlice);
  });

  it('updates only on slice state changes', async () => {
    const controller = new SliceController(host, store, audioSlice);
    host.connect();

    const initialCount = host.updateCount;

    // Change audio state
    await store.request.setVolume(0.5);
    await vi.runAllTimersAsync();

    expect(controller.value.volume).toBe(0.5);
    expect(host.updateCount).toBeGreaterThan(initialCount);
  });

  it('subscribes with selector for slice keys', async () => {
    const _controller = new SliceController(host, store, audioSlice);
    host.connect();

    const subscribeSpy = vi.spyOn(store, 'subscribe');

    // Reconnect to check subscription
    host.disconnect();
    host.connect();

    // Should pass a selector function and listener to subscribe
    expect(subscribeSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
  });

  describe('isSupported method', () => {
    it('returns true when slice is registered in store', () => {
      const controller = new SliceController(host, store, audioSlice);

      expect(controller.isSupported()).toBe(true);
    });

    it('returns false when slice is not registered in store', () => {
      // Create a different slice that's not in the store
      const unregisteredSlice = createSlice<MockMedia>()({
        initialState: { currentTime: 0 },
        getSnapshot: () => ({ currentTime: 0 }),
        subscribe: () => {},
        request: {},
      });

      // Create a store without this slice
      const limitedStore = createStore({ slices: [audioSlice] });
      limitedStore.attach(media);

      // Use type assertion since we're testing runtime behavior
      const controller = new SliceController(host, limitedStore as any, unregisteredSlice as any);

      expect(controller.isSupported()).toBe(false);

      limitedStore.destroy();
    });
  });
});

// ----------------------------------------
// PendingController Tests
// ----------------------------------------

describe('pendingController', () => {
  let host: MockHost;
  let store: ReturnType<typeof createStore<[typeof playbackSlice]>>;
  let media: MockMedia;

  beforeEach(() => {
    vi.useRealTimers(); // Use real timers for async tests
    host = new MockHost();
    store = createStore({ slices: [playbackSlice] });
    media = new MockMedia();
    store.attach(media);
  });

  afterEach(() => {
    store.destroy();
  });

  it('initially has no pending tasks', () => {
    const controller = new PendingController(host, store);

    expect(controller.any).toBe(false);
    expect(controller.size).toBe(0);
    expect(Reflect.ownKeys(controller.value).length).toBe(0);
  });

  it('exposes the store instance', () => {
    const controller = new PendingController(host, store);

    expect(controller.store).toBe(store);
  });

  it('tracks pending tasks', async () => {
    const controller = new PendingController(host, store);
    host.connect();

    // Start an async task
    const playPromise = store.request.play();

    // Wait for task to start
    await new Promise(r => setTimeout(r, 5));

    expect(controller.any).toBe(true);
    expect(controller.has('playback')).toBe(true);
    expect(controller.size).toBe(1);

    // Wait for completion
    await playPromise;

    expect(controller.any).toBe(false);
    expect(controller.has('playback')).toBe(false);
  });

  it('updates host when pending changes', async () => {
    const _controller = new PendingController(host, store);
    host.connect();

    const initialCount = host.updateCount;

    const playPromise = store.request.play();
    await new Promise(r => setTimeout(r, 5));

    expect(host.updateCount).toBeGreaterThan(initialCount);

    await playPromise;

    // Should update again when task completes
    expect(host.updateCount).toBeGreaterThan(initialCount + 1);
  });

  it('get() returns pending task info', async () => {
    const controller = new PendingController(host, store);
    host.connect();

    const playPromise = store.request.play();
    await new Promise(r => setTimeout(r, 5));

    const task = controller.get('playback');

    expect(task).toBeDefined();
    expect(task?.name).toBe('play');
    expect(task?.key).toBe('playback');

    await playPromise;
  });

  it('unsubscribes on hostDisconnected', async () => {
    const _controller = new PendingController(host, store);
    host.connect();
    host.disconnect();

    const initialCount = host.updateCount;

    const playPromise = store.request.play();
    await new Promise(r => setTimeout(r, 5));
    await playPromise;

    // Should not have updated after disconnect
    expect(host.updateCount).toBe(initialCount);
  });
});
