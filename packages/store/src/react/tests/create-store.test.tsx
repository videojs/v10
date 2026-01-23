import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import { createFeature } from '../../core/feature';
import { createStore } from '../create-store';

describe('createStore', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
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
        return volume;
      },
    },
  });

  describe('create', () => {
    it('creates a store instance', () => {
      const { create } = createStore({ features: [audioFeature] });

      const store = create();

      expect(store).toBeDefined();
      expect(store.state).toEqual({ volume: 1, muted: false });
    });
  });

  describe('provider', () => {
    it('creates store on mount', () => {
      const { Provider, useStore } = createStore({ features: [audioFeature] });

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>,
      });

      expect(result.current).toBeDefined();
      expect(result.current.volume).toBe(1);
      expect(result.current.request).toBeDefined();
    });

    it('uses provided store prop without destroying on unmount', () => {
      const { Provider, useStore, create } = createStore({
        features: [audioFeature],
      });
      const providedStore = create();

      const { unmount } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={providedStore}>{children}</Provider>,
      });

      unmount();

      // Store should NOT be destroyed because it was provided
      expect(providedStore.destroyed).toBe(false);
    });

    it('sets displayName on Provider', () => {
      const { Provider } = createStore({
        features: [audioFeature],
        displayName: 'TestStore',
      });

      expect(Provider.displayName).toBe('TestStore.Provider');
    });
  });

  describe('useStore', () => {
    it('returns state with request from context', () => {
      const { Provider, useStore, create } = createStore({
        features: [audioFeature],
      });
      const store = create();
      const target = new MockMedia();
      store.attach(target);

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.volume).toBe(1);
      expect(result.current.muted).toBe(false);
      expect(result.current.request).toBeDefined();
      expect(typeof result.current.request.setVolume).toBe('function');
    });

    it('updates when state changes', async () => {
      const { Provider, useStore, create } = createStore({
        features: [audioFeature],
      });
      const store = create();
      const target = new MockMedia();
      store.attach(target);

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.volume).toBe(1);

      await act(async () => {
        target.volume = 0.5;
        target.dispatchEvent(new Event('volumechange'));
      });

      expect(result.current.volume).toBe(0.5);
    });
  });

  describe('useQueue', () => {
    it('returns tasks from context store', () => {
      const { Provider, useQueue, create } = createStore({
        features: [audioFeature],
      });
      const store = create();

      const { result } = renderHook(() => useQueue(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toEqual({});
    });
  });
});
