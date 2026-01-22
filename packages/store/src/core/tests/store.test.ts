import { describe, expect, it, vi } from 'vitest';

import { createFeature } from '../feature';
import { createQueue } from '../queue';
import { flush } from '../state';
import { createStore } from '../store';

describe('store', () => {
  // Mock target that mimics HTMLVideoElement
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
    paused = true;
    play = vi.fn();
    pause = vi.fn();
  }

  const audioFeature = createFeature<MockMedia>()({
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
      },
      setMuted: (muted: boolean, { target }) => {
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
      },
    },
  });

  const playbackFeature = createFeature<MockMedia>()({
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
        features: [audioFeature, playbackFeature],
      });

      expect(store.state.current).toEqual({
        volume: 1,
        muted: false,
        paused: true,
      });
    });

    it('creates store with default queue', () => {
      const store = createStore({
        features: [audioFeature],
      });

      expect(store.queue).toBeDefined();
    });

    it('accepts custom queue', () => {
      const queue = createQueue<any>();

      const store = createStore({
        features: [audioFeature],
        queue,
      });

      expect(store.queue).toBe(queue);
    });

    it('calls onSetup', () => {
      const onSetup = vi.fn();
      const store = createStore({
        features: [audioFeature],
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
        features: [audioFeature],
      });

      const media = new MockMedia();
      media.volume = 0.5;
      media.muted = true;

      store.attach(media);

      expect(store.state.current).toEqual({ volume: 0.5, muted: true });
      expect(store.target).toBe(media);
    });

    it('calls onAttach', () => {
      const onAttach = vi.fn();
      const store = createStore({
        features: [audioFeature],
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
        features: [audioFeature],
      });

      const media = new MockMedia();
      const addListenerSpy = vi.spyOn(media, 'addEventListener');

      store.attach(media);

      expect(addListenerSpy).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });

    it('detach cleans up', () => {
      const store = createStore({
        features: [audioFeature],
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
        features: [audioFeature],
      });

      const media1 = new MockMedia();
      const m1RemoveListenerSpy = vi.spyOn(media1, 'removeEventListener');

      const media2 = new MockMedia();

      media2.volume = 0.3;

      store.attach(media1);
      store.attach(media2);

      expect(store.target).toBe(media2);
      expect(store.state.current.volume).toBe(0.3);
      expect(m1RemoveListenerSpy).toHaveBeenCalled();
    });
  });

  describe('request', () => {
    it('executes request on target', async () => {
      const store = createStore({
        features: [audioFeature],
      });

      const media = new MockMedia();
      store.attach(media);

      await store.request.setVolume(0.5);

      expect(media.volume).toBe(0.5);
    });

    it('throws StoreError without target', async () => {
      const store = createStore({
        features: [audioFeature],
        onError: () => {}, // silence errors
      });

      await expect(store.request.setVolume(0.5)).rejects.toMatchObject({ code: 'NO_TARGET' });
    });

    it('coordinates requests with same key', async () => {
      const store = createStore({
        features: [playbackFeature],
        onError: () => {}, // silence errors
      });

      const media = new MockMedia();
      store.attach(media);

      const playPromise = store.request.play();
      const pausePromise = store.request.pause();

      await expect(playPromise).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await pausePromise;

      expect(media.paused).toBe(true);
    });

    it('accepts metadata', async () => {
      const handlerSpy = vi.fn();

      const feature = createFeature<MockMedia>()({
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
        features: [feature],
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
        features: [audioFeature],
      });

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      store.state.subscribe(listener);

      await store.request.setVolume(0.5);
      flush();

      expect(listener).toHaveBeenCalled();
      expect(store.state.current.volume).toBe(0.5);
    });

    it('unsubscribe stops notifications', async () => {
      const store = createStore({
        features: [audioFeature],
      });

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      const unsubscribe = store.state.subscribe(listener);
      unsubscribe();

      await store.request.setVolume(0.5);
      flush();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('cleans up everything', () => {
      const store = createStore({
        features: [audioFeature],
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
        features: [audioFeature],
      });

      store.attach(new MockMedia());
      store.destroy();

      await expect(store.request.setVolume(0.5)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('calls onError for request errors', async () => {
      const onError = vi.fn();

      const failingFeature = createFeature<MockMedia>()({
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
        features: [failingFeature],
        onError,
      });

      store.attach(new MockMedia());

      await store.request.fail().catch(() => {});

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          store,
        }),
      );
    });
  });
});
