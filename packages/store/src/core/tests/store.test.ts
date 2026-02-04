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
    state: ({ target }) => ({
      volume: 1,
      muted: false,
      setVolume(volume: number) {
        target().volume = volume;
        target().dispatchEvent(new Event('volumechange'));
      },
      setMuted(muted: boolean) {
        target().muted = muted;
        target().dispatchEvent(new Event('volumechange'));
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
    state: ({ target }) => ({
      paused: true,
      play() {
        target().play();
        target().paused = false;
      },
      pause() {
        target().pause();
        target().paused = true;
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
    it('executes action on target', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      store.setVolume(0.5);

      expect(media.volume).toBe(0.5);
    });

    it('throws StoreError without target', () => {
      const store = createStore<MockMedia>()(audioSlice, { onError: () => {} });

      expect(() => store.setVolume(0.5)).toThrow();
    });
  });

  describe('subscribe', () => {
    it('notifies on state change', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      store.subscribe(listener);

      store.setVolume(0.5);
      flush();

      expect(listener).toHaveBeenCalled();
      expect(store.state.volume).toBe(0.5);
    });

    it('unsubscribe stops notifications', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      unsubscribe();

      store.setVolume(0.5);
      flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('respects abort signal', () => {
      const store = createStore<MockMedia>()(audioSlice);

      const media = new MockMedia();
      store.attach(media);

      const listener = vi.fn();
      const controller = new AbortController();
      store.subscribe(listener, { signal: controller.signal });

      controller.abort();
      store.setVolume(0.5);
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

    it('throws on attach after destroy', () => {
      const store = createStore<MockMedia>()(audioSlice);
      store.destroy();

      expect(() => store.attach(new MockMedia())).toThrow();
    });
  });

  describe('error handling', () => {
    it('calls onError for action errors', () => {
      const onError = vi.fn();

      const failingSlice = defineSlice<MockMedia>()({
        state: ({ target }) => ({
          value: 0,
          fail() {
            target(); // This will throw NO_TARGET
          },
        }),
      });

      const store = createStore<MockMedia>()(failingSlice, { onError });

      // No target attached, so target() will throw
      expect(() => store.fail()).toThrow();
    });
  });

  describe('signal and abort', () => {
    it('signal() throws when not attached', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal }) => ({
          getSignal: () => signal(),
        }),
      });

      const store = createStore<MockMedia>()(slice);

      expect(() => store.getSignal()).toThrow();
    });

    it('signal() returns AbortSignal when attached', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal }) => ({
          getSignal: () => signal(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig = store.getSignal();

      expect(sig).toBeInstanceOf(AbortSignal);
      expect(sig.aborted).toBe(false);
    });

    it('signal aborts on detach', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal }) => ({
          getSignal: () => signal(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      const detach = store.attach(new MockMedia());

      const sig = store.getSignal();
      expect(sig.aborted).toBe(false);

      detach();

      expect(sig.aborted).toBe(true);
    });

    it('abort() aborts current signal', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal, abort }) => ({
          getSignal: () => signal(),
          abort: () => abort(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig1 = store.getSignal();
      expect(sig1.aborted).toBe(false);

      store.abort();

      expect(sig1.aborted).toBe(true);
    });

    it('abort() creates new signal for subsequent operations', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal, abort }) => ({
          getSignal: () => signal(),
          abort: () => abort(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig1 = store.getSignal();
      store.abort();

      const sig2 = store.getSignal();

      expect(sig1.aborted).toBe(true);
      expect(sig2.aborted).toBe(false);
      expect(sig1).not.toBe(sig2);
    });

    it('signal aborts on reattach', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signal }) => ({
          getSignal: () => signal(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig = store.getSignal();
      expect(sig.aborted).toBe(false);

      store.attach(new MockMedia()); // Reattach

      expect(sig.aborted).toBe(true);
    });
  });
});
