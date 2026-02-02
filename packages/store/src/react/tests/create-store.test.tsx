import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import { defineFeature } from '../../core/feature';
import { createStore } from '../create-store';

interface AudioState {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => Promise<number>;
}

describe('createStore', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
  }

  const audioFeature = defineFeature<MockMedia>()({
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
    }),
    attach({ target, signal, set }) {
      const sync = () =>
        set({
          volume: target.volume,
          muted: target.muted,
        });

      sync();

      target.addEventListener('volumechange', sync);
      signal.addEventListener('abort', () => {
        target.removeEventListener('volumechange', sync);
      });
    },
  });

  describe('create', () => {
    it('creates a store instance', () => {
      const { create } = createStore({ features: [audioFeature] });

      const store = create();

      expect(store).toBeDefined();
      expect(store.state).toMatchObject({ volume: 1, muted: false });
    });
  });

  describe('provider', () => {
    it('creates store on mount', () => {
      const { Provider, useStore } = createStore({ features: [audioFeature] });

      const { result } = renderHook(() => useStore() as AudioState, {
        wrapper: ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>,
      });

      expect(result.current).toBeDefined();
      expect(result.current.volume).toBe(1);
      expect(typeof result.current.setVolume).toBe('function');
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
    it('returns state and action functions from context', () => {
      const { Provider, useStore, create } = createStore({
        features: [audioFeature],
      });
      const store = create();
      const target = new MockMedia();
      store.attach(target);

      const { result } = renderHook(() => useStore() as AudioState, {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current.volume).toBe(1);
      expect(result.current.muted).toBe(false);
      expect(typeof result.current.setVolume).toBe('function');
    });

    it('does not re-render on state change (no subscription)', async () => {
      const { Provider, useStore, create } = createStore({
        features: [audioFeature],
      });
      const store = create();
      const target = new MockMedia();
      store.attach(target);
      let renderCount = 0;

      const { result } = renderHook(
        () => {
          renderCount++;
          return useStore() as AudioState;
        },
        {
          wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
        }
      );

      expect(renderCount).toBe(1);
      expect(result.current.volume).toBe(1);

      await act(async () => {
        target.volume = 0.5;
        target.dispatchEvent(new Event('volumechange'));
      });

      // Should NOT have re-rendered
      expect(renderCount).toBe(1);
      // But store state DID change
      expect(store.state.volume).toBe(0.5);
    });
  });
});
