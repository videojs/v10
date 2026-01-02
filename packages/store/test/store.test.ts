import { describe, expect, it, vi } from 'vitest';

import { StoreError } from '../src/errors';
import { createQueue } from '../src/queue';
import { createSlice } from '../src/slice';
import { createStore } from '../src/store';

describe('store', () => {
  // Mock target that mimics HTMLVideoElement
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
    paused = true;
    play = vi.fn();
    pause = vi.fn();
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
    subscribe: () => {},
    request: {
      play: {
        key: 'playback',
        async handler(_, { target }) {
          target.play();
          target.paused = false;
        },
      },
      pause: {
        key: 'playback',
        async handler(_, { target }) {
          target.pause();
          target.paused = true;
        },
      },
    },
  });

  describe('creation', () => {
    it('creates store with merged initial state', () => {
      const store = createStore({
        slices: [audioSlice, playbackSlice],
      });

      expect(store.state).toEqual({
        volume: 1,
        muted: false,
        paused: true,
      });
    });

    it('creates store with default queue', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      expect(store.queue).toBeDefined();
    });

    it('accepts custom queue', () => {
      const queue = createQueue<any>();

      const store = createStore({
        slices: [audioSlice],
        queue,
      });

      expect(store.queue).toBe(queue);
    });

    it('calls onSetup', () => {
      const onSetup = vi.fn();
      const store = createStore({
        slices: [audioSlice],
        onSetup,
      });

      expect(onSetup).toHaveBeenCalledWith({
        store,
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('attach', () => {
    it('syncs state from target', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      media.volume = 0.5;
      media.muted = true;

      store.attach(media);

      expect(store.state).toEqual({ volume: 0.5, muted: true });
      expect(store.target).toBe(media);
    });

    it('calls onAttach', () => {
      const onAttach = vi.fn();
      const store = createStore({
        slices: [audioSlice],
        onAttach,
      });

      const media = new MockMedia();
      store.attach(media);

      expect(onAttach).toHaveBeenCalledWith({
        store,
        target: media,
        signal: expect.any(AbortSignal),
      });
    });

    it('sets up subscriptions', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      const addListenerSpy = vi.spyOn(media, 'addEventListener');

      store.attach(media);

      expect(addListenerSpy).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });

    it('detach cleans up', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      const removeListenerSpy = vi.spyOn(media, 'removeEventListener');

      const detach = store.attach(media);
      detach();

      expect(store.target).toBeNull();
      expect(removeListenerSpy).toHaveBeenCalled();
    });

    it('reattach cleans up previous', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media1 = new MockMedia();
      const m1RemoveListenerSpy = vi.spyOn(media1, 'removeEventListener');

      const media2 = new MockMedia();

      media2.volume = 0.3;

      store.attach(media1);
      store.attach(media2);

      expect(store.target).toBe(media2);
      expect(store.state.volume).toBe(0.3);
      expect(m1RemoveListenerSpy).toHaveBeenCalled();
    });
  });

  describe('request', () => {
    it('executes request on target', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);

      await store.request.setVolume(0.5);

      expect(media.volume).toBe(0.5);
    });

    it('throws StoreError without target', async () => {
      const store = createStore({
        slices: [audioSlice],
        onError: () => {}, // silence errors
      });

      await expect(store.request.setVolume(0.5)).rejects.toThrow(StoreError);
    });

    it('coordinates requests with same key', async () => {
      const store = createStore({
        slices: [playbackSlice],
        onError: () => {}, // silence errors
      });

      const media = new MockMedia();
      store.attach(media);

      const playPromise = store.request.play();
      const pausePromise = store.request.pause();

      await expect(playPromise).rejects.toThrow(StoreError);
      await pausePromise;

      expect(media.paused).toBe(true);
    });

    it('accepts metadata', async () => {
      const handlerSpy = vi.fn();

      const slice = createSlice<MockMedia>()({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          action: {
            handler: (_, ctx) => {
              handlerSpy(ctx.meta);
            },
          },
        },
      });

      const store = createStore({
        slices: [slice],
      });

      store.attach(new MockMedia());

      await store.request.action(null, {
        source: 'user',
        reason: 'test',
      });

      expect(handlerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'user',
          reason: 'test',
        }),
      );
    });
  });

  describe('subscribe', () => {
    it('notifies on state change', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      store.subscribe(listener);

      await store.request.setVolume(0.5);

      const calls = listener.mock.calls;
      const lastState = calls[calls.length - 1][0];
      expect(lastState.volume).toBe(0.5);
    });

    it('selector subscription only notifies when selected value changes', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);

      const volumeListener = vi.fn();
      store.subscribe(s => s.volume, volumeListener);

      // Reset after attach sync
      volumeListener.mockClear();

      await store.request.setMuted(true);
      expect(volumeListener).not.toHaveBeenCalled();

      await store.request.setVolume(0.7);
      expect(volumeListener).toHaveBeenCalledWith(0.7);
    });

    it('object selector uses key optimization', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      store.subscribe(s => ({ volume: s.volume, muted: s.muted }), listener);

      // Reset after attach sync
      listener.mockClear();

      await store.request.setVolume(0.5);
      expect(listener).toHaveBeenCalledWith({ volume: 0.5, muted: false });
    });

    it('supports custom equality function', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      // Custom equality that ignores small volume changes
      store.subscribe(s => s.volume, listener, { equalityFn: (a, b) => Math.abs(a - b) < 0.1 });

      // Reset after attach sync
      listener.mockClear();

      await store.request.setVolume(0.95); // Within threshold of 1
      expect(listener).not.toHaveBeenCalled();

      await store.request.setVolume(0.5); // Outside threshold
      expect(listener).toHaveBeenCalledWith(0.5);
    });
  });

  describe('destroy', () => {
    it('cleans up everything', () => {
      const store = createStore({
        slices: [audioSlice],
      });

      const media = new MockMedia();
      store.attach(media);
      store.destroy();

      expect(store.destroyed).toBe(true);
      expect(store.target).toBeNull();
      expect(store.queue.destroyed).toBe(true);
    });

    it('rejects requests after destroy', async () => {
      const store = createStore({
        slices: [audioSlice],
      });

      store.attach(new MockMedia());
      store.destroy();

      await expect(store.request.setVolume(0.5)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('calls onError for request errors', async () => {
      const onError = vi.fn();

      const failingSlice = createSlice<MockMedia>()({
        initialState: {},
        getSnapshot: () => ({}),
        subscribe: () => {},
        request: {
          fail: () => {
            throw new Error('request failed');
          },
        },
      });

      const store = createStore({
        slices: [failingSlice],
        onError,
      });

      store.attach(new MockMedia());

      await store.request.fail().catch(() => {});

      expect(onError).toHaveBeenCalledWith({
        error: expect.any(Error),
        store,
      });
    });
  });
});
