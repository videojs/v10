import { describe, expect, it, vi } from 'vitest';

import { combine } from '../combine';
import { defineSlice } from '../slice';
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

  const audioSlice = defineSlice<MockMedia>()({
    state: ({ task }) => ({
      volume: 1,
      muted: false,
      setVolume(volume: number) {
        return task(({ target }) => {
          target.volume = volume;
          target.dispatchEvent(new Event('volumechange'));
        });
      },
      setMuted(muted: boolean) {
        return task(({ target }) => {
          target.muted = muted;
          target.dispatchEvent(new Event('volumechange'));
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

  const playbackSlice = defineSlice<MockMedia>()({
    state: ({ task }) => ({
      paused: true,
      play() {
        return task({
          key: 'playback',
          async handler({ target }) {
            target.play();
            target.paused = false;
          },
        });
      },
      pause() {
        return task({
          key: 'playback',
          async handler({ target }) {
            target.pause();
            target.paused = true;
          },
        });
      },
    }),

    attach({ target, set }) {
      set({ paused: target.paused });
    },
  });

  describe('creation', () => {
    it('creates store with merged initial state', () => {
      const store = createStore<MockMedia>()(combine(audioSlice, playbackSlice));

      expect(store.state).toMatchObject({
        volume: 1,
        muted: false,
        paused: true,
      });
    });

    it('calls onSetup', () => {
      const onSetup = vi.fn();
      const store = createStore<MockMedia>()(audioSlice, { onSetup });

      expect(onSetup).toHaveBeenCalledWith({
        store,
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('attach', () => {
    it('syncs state from target', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      media.volume = 0.5;
      media.muted = true;

      store.attach(media);

      expect(store.state).toMatchObject({ volume: 0.5, muted: true });
      expect(store.target).toBe(media);
    });

    it('calls onAttach', () => {
      const onAttach = vi.fn();
      const store = createStore<MockMedia>()(audioSlice, { onAttach });

      const media = new MockMedia();
      store.attach(media);

      expect(onAttach).toHaveBeenCalledWith({
        store,
        target: media,
        signal: expect.any(AbortSignal),
      });
    });

    it('sets up subscriptions', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      const addListenerSpy = vi.spyOn(media, 'addEventListener');

      store.attach(media);

      expect(addListenerSpy).toHaveBeenCalledWith('volumechange', expect.any(Function));
    });

    it('detach cleans up', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      const removeListenerSpy = vi.spyOn(media, 'removeEventListener');

      const detach = store.attach(media);
      detach();

      expect(store.target).toBeNull();
      expect(removeListenerSpy).toHaveBeenCalled();
    });

    it('reattach cleans up previous', () => {
      const store = createStore<MockMedia>()(audioSlice);

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

  describe('actions', () => {
    it('executes action on target', async () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      await store.setVolume(0.5);

      expect(media.volume).toBe(0.5);
    });

    it('throws StoreError without target', async () => {
      const store = createStore<MockMedia>()(audioSlice, { onError: () => {} });

      await expect(store.setVolume(0.5)).rejects.toMatchObject({ code: 'NO_TARGET' });
    });

    it('coordinates actions with same key', async () => {
      const store = createStore<MockMedia>()(playbackSlice, { onError: () => {} });

      const media = new MockMedia();
      store.attach(media);

      const playPromise = store.play();
      const pausePromise = store.pause();

      await expect(playPromise).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await pausePromise;

      expect(media.paused).toBe(true);
    });

    it('passes meta to handler', async () => {
      let receivedMeta: unknown = null;

      const slice = defineSlice<MockMedia>()({
        state: ({ task }) => ({
          value: 0,
          action() {
            return task({
              key: 'action',
              handler({ meta }) {
                receivedMeta = meta;
              },
            });
          },
        }),
      });

      const store = createStore<MockMedia>()(slice);

      store.attach(new MockMedia());

      await store.meta({ source: 'user', reason: 'test' }).action();

      expect(receivedMeta).toMatchObject({
        source: 'user',
        reason: 'test',
      });
    });

    it('clears meta after action without task()', async () => {
      let receivedMeta: unknown = 'not-called';

      const slice = defineSlice<MockMedia>()({
        state: ({ task }) => ({
          value: 0,
          // Sync action that doesn't use task()
          syncAction() {
            // Does nothing with meta
          },
          // Action that uses task() to capture meta
          asyncAction() {
            return task({
              key: 'async',
              handler({ meta }) {
                receivedMeta = meta;
              },
            });
          },
        }),
      });

      const store = createStore<MockMedia>()(slice);

      store.attach(new MockMedia());

      // Call sync action with meta - meta should be cleared after
      store.meta({ source: 'user', reason: 'sync' }).syncAction();

      // Call async action without meta - should NOT receive leaked meta
      await store.asyncAction();

      expect(receivedMeta).toBeNull();
    });

    it('isolates meta between chained calls', async () => {
      const receivedMetas: unknown[] = [];

      const slice = defineSlice<MockMedia>()({
        state: ({ task }) => ({
          value: 0,
          action() {
            return task({
              key: 'action',
              handler({ meta }) {
                receivedMetas.push(meta);
              },
            });
          },
        }),
      });

      const store = createStore<MockMedia>()(slice);

      store.attach(new MockMedia());

      await store.meta({ source: 'first' }).action();
      await store.meta({ source: 'second' }).action();
      await store.action(); // No meta

      expect(receivedMetas).toHaveLength(3);
      expect(receivedMetas[0]).toMatchObject({ source: 'first' });
      expect(receivedMetas[1]).toMatchObject({ source: 'second' });
      expect(receivedMetas[2]).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('notifies on state change', async () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      store.subscribe(listener);

      await store.setVolume(0.5);
      flush();

      expect(listener).toHaveBeenCalled();
      expect(store.state.volume).toBe(0.5);
    });

    it('unsubscribe stops notifications', async () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      await store.setVolume(0.5);
      flush();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('cleans up everything', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);
      store.destroy();

      expect(store.destroyed).toBe(true);
      expect(store.target).toBeNull();
    });

    it('rejects actions after destroy', async () => {
      const store = createStore<MockMedia>()(audioSlice);

      store.attach(new MockMedia());
      store.destroy();

      await expect(store.setVolume(0.5)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('calls onError for action errors', async () => {
      const onError = vi.fn();

      const failingSlice = defineSlice<MockMedia>()({
        state: ({ task }) => ({
          value: 0,
          fail() {
            return task(() => {
              throw new Error('action failed');
            });
          },
        }),
      });

      const store = createStore<MockMedia>()(failingSlice, { onError });

      store.attach(new MockMedia());

      await store.fail().catch(() => {});

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          store,
        })
      );
    });
  });
});
