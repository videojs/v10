import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore } from '../create-store';

describe('createStore', () => {
  // Mock target
  class MockMedia extends EventTarget {
    volume = 1;
    muted = false;
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
        return volume;
      },
    },
  });

  describe('create', () => {
    it('creates a store instance', () => {
      const { create } = createStore({ slices: [audioSlice] });

      const store = create();

      expect(store).toBeDefined();
      expect(store.state).toEqual({ volume: 1, muted: false });
    });
  });

  describe('provider', () => {
    it('creates store on mount', () => {
      const { Provider, useStore } = createStore({ slices: [audioSlice] });

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>,
      });

      expect(result.current).toBeDefined();
      expect(result.current.state).toEqual({ volume: 1, muted: false });
    });

    it('destroys store on unmount', () => {
      const { Provider, useStore } = createStore({ slices: [audioSlice] });

      const { result, unmount } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>,
      });

      const store = result.current;
      expect(store.destroyed).toBe(false);

      unmount();

      expect(store.destroyed).toBe(true);
    });

    it('uses provided store prop without destroying on unmount', () => {
      const { Provider, useStore, create } = createStore({ slices: [audioSlice] });
      const providedStore = create();

      const { result, unmount } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={providedStore}>{children}</Provider>,
      });

      expect(result.current).toBe(providedStore);

      unmount();

      // Store should NOT be destroyed because it was provided
      expect(providedStore.destroyed).toBe(false);
    });

    it('inherits store from parent when inherit=true', () => {
      const { Provider, useStore, create } = createStore({ slices: [audioSlice] });
      const parentStore = create();

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Provider store={parentStore}>
            <Provider inherit>{children}</Provider>
          </Provider>
        ),
      });

      expect(result.current).toBe(parentStore);
    });

    it('creates isolated store by default', () => {
      const { Provider, useStore, create } = createStore({ slices: [audioSlice] });
      const parentStore = create();

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Provider store={parentStore}>
            <Provider>{children}</Provider>
          </Provider>
        ),
      });

      // Should be a different store
      expect(result.current).not.toBe(parentStore);
    });

    it('sets displayName on Provider', () => {
      const { Provider } = createStore({
        slices: [audioSlice],
        displayName: 'TestStore',
      });

      expect(Provider.displayName).toBe('TestStore.Provider');
    });
  });

  describe('useStore', () => {
    it('returns the store from context', () => {
      const { Provider, useStore, create } = createStore({ slices: [audioSlice] });
      const store = create();

      const { result } = renderHook(() => useStore(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toBe(store);
    });
  });

  describe('useSelector', () => {
    it('selects state from context store', () => {
      const { Provider, useSelector, create } = createStore({ slices: [audioSlice] });
      const store = create();
      const target = new MockMedia();
      store.attach(target);

      const { result } = renderHook(() => useSelector(s => s.volume), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toBe(1);
    });

    it('updates when state changes', async () => {
      const { Provider, useSelector, create } = createStore({ slices: [audioSlice] });
      const store = create();
      const target = new MockMedia();
      store.attach(target);

      const { result } = renderHook(() => useSelector(s => s.volume), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toBe(1);

      await act(async () => {
        target.volume = 0.5;
        target.dispatchEvent(new Event('volumechange'));
      });

      expect(result.current).toBe(0.5);
    });
  });

  describe('useRequest', () => {
    it('returns request map from context store', () => {
      const { Provider, useRequest, create } = createStore({ slices: [audioSlice] });
      const store = create();

      const { result } = renderHook(() => useRequest(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toHaveProperty('setVolume');
    });

    it('returns selected request', () => {
      const { Provider, useRequest, create } = createStore({ slices: [audioSlice] });
      const store = create();

      const { result } = renderHook(() => useRequest(r => r.setVolume), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(typeof result.current).toBe('function');
    });
  });

  describe('useTasks', () => {
    it('returns tasks from context store', () => {
      const { Provider, useTasks, create } = createStore({ slices: [audioSlice] });
      const store = create();

      const { result } = renderHook(() => useTasks(), {
        wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
      });

      expect(result.current).toEqual({});
    });
  });
});
