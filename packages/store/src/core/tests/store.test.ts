import { describe, expect, it, vi } from 'vitest';

import { combine } from '../combine';
import { defineSlice } from '../slice';
import { flush } from '../state';
import { createStore, isStore } from '../store';

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

    it('exposes $state container matching store.state', () => {
      const store = createStore<MockMedia>()(audioSlice);
      const media = new MockMedia();
      store.attach(media);

      expect(store.$state.current).toBe(store.state);

      const callback = vi.fn();
      store.$state.subscribe(callback);

      media.volume = 0.5;
      media.dispatchEvent(new Event('volumechange'));
      flush();

      expect(callback).toHaveBeenCalled();
      expect(store.$state.current.volume).toBe(0.5);
    });

    it('calls onSetup', () => {
      const onSetup = vi.fn();
      const store = createStore<MockMedia>()(audioSlice, { onSetup });

      expect(onSetup).toHaveBeenCalledWith({
        store,
        signal: expect.any(AbortSignal),
      });
    });

    it('identifies stores across package entrypoints', () => {
      const store = createStore<MockMedia>()(audioSlice);

      expect(isStore(store)).toBe(true);
      expect(Symbol.for('@videojs/store') in store).toBe(true);
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

  describe('config and derived state', () => {
    const INTERNAL_VALUE = Symbol('internalValue');

    interface TestConfig {
      value: string | null;
      fallback: string;
    }

    interface TestSourceState {
      [INTERNAL_VALUE]: string | undefined;
      setInternal(value: string | undefined): void;
      setValue(value: string | null): void;
    }

    const responsiveSlice = defineSlice<MockMedia, TestConfig>()({
      config: { value: null, fallback: 'fallback' },
      state: ({ config, set }): TestSourceState => ({
        [INTERNAL_VALUE]: undefined,
        setInternal: (value) => set({ [INTERNAL_VALUE]: value }),
        setValue: (value) => config.set({ value }),
      }),
      derived: {
        resolved: ({ config, get }) => config.get().value ?? get()[INTERNAL_VALUE] ?? config.get().fallback,
      },
    });

    it('overlays initial config and resets explicit undefined to the declared initial value', () => {
      const store = createStore<MockMedia>()(responsiveSlice, { config: { value: 'initial' } });

      expect(store.resolved).toBe('initial');
      expect(store.$config.get()).toEqual({ value: 'initial', fallback: 'fallback' });

      store.$config.set({ value: undefined });

      expect(store.resolved).toBe('fallback');
      expect(store.$config.get().value).toBeNull();
    });

    it('publishes source and derived changes atomically while keeping symbols internal', () => {
      const store = createStore<MockMedia>()(responsiveSlice);

      expect(Object.getOwnPropertySymbols(store.state)).toEqual([]);
      expect(Object.getOwnPropertySymbols(store)).toEqual([Symbol.for('@videojs/store')]);

      store.setInternal('media');

      expect(store.resolved).toBe('media');
      expect(Object.getOwnPropertySymbols(store.state)).toEqual([]);
    });

    it('keeps lower-precedence source state live without publishing an unchanged public snapshot', () => {
      const store = createStore<MockMedia>()(responsiveSlice, { config: { value: 'user' } });
      const listener = vi.fn();
      store.subscribe(listener);
      const publicSnapshot = store.state;

      store.setInternal('latest media');
      flush();

      expect(store.resolved).toBe('user');
      expect(store.state).toBe(publicSnapshot);
      expect(listener).not.toHaveBeenCalled();

      store.setValue(null);
      flush();

      expect(store.resolved).toBe('latest media');
      expect(listener).toHaveBeenCalledOnce();
    });

    it('resets source state on detach while preserving config', () => {
      const store = createStore<MockMedia>()(responsiveSlice, { config: { fallback: 'configured fallback' } });
      const detach = store.attach(new MockMedia());

      store.setInternal('media');
      expect(store.resolved).toBe('media');

      detach();

      expect(store.resolved).toBe('configured fallback');
      expect(store.$config.get().fallback).toBe('configured fallback');
    });

    it('does not commit config when a derived formula throws', () => {
      interface ThrowingConfig {
        value: number;
      }

      const throwingSlice = defineSlice<MockMedia, ThrowingConfig>()({
        config: { value: 1 },
        state: () => ({}),
        derived: {
          doubled: ({ config }) => {
            const { value } = config.get();
            if (value < 0) throw new Error('invalid value');
            return value * 2;
          },
        },
      });
      const store = createStore<MockMedia>()(throwingSlice);
      const listener = vi.fn();
      store.subscribe(listener);

      expect(() => store.$config.set({ value: -1 })).toThrow('invalid value');
      flush();

      expect(store.doubled).toBe(2);
      expect(store.$config.get().value).toBe(1);
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
    it('reports event-driven derived errors without committing the update', () => {
      const onError = vi.fn();
      const listener = vi.fn();
      const invalidValueError = new Error('invalid value');
      const slice = defineSlice<MockMedia>()({
        state: () => ({ value: 1 }),
        derived: {
          doubled: ({ get }) => {
            const { value } = get();
            if (value < 0) throw invalidValueError;
            return value * 2;
          },
        },
        attach({ target, signal, set }) {
          const sync = () => set({ value: target.volume });
          target.addEventListener('volumechange', sync);
          signal.addEventListener('abort', () => target.removeEventListener('volumechange', sync));
        },
      });
      const store = createStore<MockMedia>()(slice, { onError });
      const media = new MockMedia();
      store.attach(media);
      store.subscribe(listener);
      const snapshot = store.state;

      media.volume = -1;
      media.dispatchEvent(new Event('volumechange'));
      flush();

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith({ store, error: invalidValueError });
      expect(store.state).toBe(snapshot);
      expect(store.state).toMatchObject({ value: 1, doubled: 2 });
      expect(listener).not.toHaveBeenCalled();
    });

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

  describe('signals', () => {
    it('signals.base returns AbortSignal', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          getBase: () => signals.base,
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig = store.getBase();

      expect(sig).toBeInstanceOf(AbortSignal);
      expect(sig.aborted).toBe(false);
    });

    it('signals.base aborts on detach', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          getBase: () => signals.base,
        }),
      });

      const store = createStore<MockMedia>()(slice);
      const detach = store.attach(new MockMedia());

      const sig = store.getBase();
      expect(sig.aborted).toBe(false);

      detach();

      expect(sig.aborted).toBe(true);
    });

    it('signals.base aborts on reattach', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          getBase: () => signals.base,
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig = store.getBase();
      expect(sig.aborted).toBe(false);

      store.attach(new MockMedia()); // Reattach

      expect(sig.aborted).toBe(true);
    });

    it('signals.supersede() returns AbortSignal combined with base', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          supersede: (key: string) => signals.supersede(key),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig = store.supersede('test');

      expect(sig).toBeInstanceOf(AbortSignal);
      expect(sig.aborted).toBe(false);
    });

    it('signals.supersede() aborts previous signal for same key', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          supersede: (key: string) => signals.supersede(key),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const sig1 = store.supersede('seek');
      const sig2 = store.supersede('seek');

      expect(sig1.aborted).toBe(true);
      expect(sig2.aborted).toBe(false);
    });

    it('signals.supersede() aborts on detach', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          supersede: (key: string) => signals.supersede(key),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      const detach = store.attach(new MockMedia());

      const sig = store.supersede('test');
      expect(sig.aborted).toBe(false);

      detach();

      expect(sig.aborted).toBe(true);
    });

    it('signals.clear() aborts keyed signals but not base', () => {
      const slice = defineSlice<MockMedia>()({
        state: ({ signals }) => ({
          getBase: () => signals.base,
          supersede: (key: string) => signals.supersede(key),
          clear: () => signals.clear(),
        }),
      });

      const store = createStore<MockMedia>()(slice);
      store.attach(new MockMedia());

      const base = store.getBase();
      const keyed = store.supersede('test');

      store.clear();

      expect(base.aborted).toBe(false);
      expect(keyed.aborted).toBe(true);
    });
  });
});
