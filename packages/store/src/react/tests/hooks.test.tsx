import { act, renderHook } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore as createCoreStore } from '../../core/store';
import { useRequest, useSelector, useTasks } from '../hooks';

describe('react hooks', () => {
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
      setMuted: (muted: boolean, { target }) => {
        target.muted = muted;
        target.dispatchEvent(new Event('volumechange'));
        return muted;
      },
    },
  });

  function createTestStore() {
    const store = createCoreStore({ slices: [audioSlice] });
    const target = new MockMedia();
    store.attach(target);
    return { store, target };
  }

  describe('useSelector', () => {
    it('returns selected state', () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useSelector(store, s => s.volume));

      expect(result.current).toBe(1);
    });

    it('re-renders when selected state changes', async () => {
      const { store, target } = createTestStore();

      const { result } = renderHook(() => useSelector(store, s => s.volume));

      expect(result.current).toBe(1);

      await act(async () => {
        target.volume = 0.5;
        target.dispatchEvent(new Event('volumechange'));
      });

      expect(result.current).toBe(0.5);
    });

    it('does not re-render when unrelated state changes', async () => {
      const { store, target } = createTestStore();
      const renderCount = vi.fn();

      renderHook(() => {
        renderCount();
        return useSelector(store, s => s.volume);
      });

      expect(renderCount).toHaveBeenCalledTimes(1);

      await act(async () => {
        target.muted = true;
        target.dispatchEvent(new Event('volumechange'));
      });

      // Should not re-render because volume didn't change
      expect(renderCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('useRequest', () => {
    it('returns request map', () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useRequest(store));

      expect(result.current).toHaveProperty('setVolume');
      expect(result.current).toHaveProperty('setMuted');
      expect(typeof result.current.setVolume).toBe('function');
    });

    it('returns selected request', () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useRequest(store, r => r.setVolume));

      expect(typeof result.current).toBe('function');
    });

    it('returns stable reference', () => {
      const { store } = createTestStore();

      const { result, rerender } = renderHook(() => useRequest(store));

      const firstRequest = result.current;
      rerender();

      expect(result.current).toBe(firstRequest);
    });
  });

  describe('useTasks', () => {
    it('returns tasks record', () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useTasks(store));

      expect(result.current).toEqual({});
    });

    it('updates when task completes', async () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useTasks(store));

      expect(result.current.setVolume).toBeUndefined();

      await act(async () => {
        await store.request.setVolume(0.5);
      });

      expect(result.current.setVolume).toBeDefined();
      expect(result.current.setVolume?.status).toBe('success');
    });
  });
});
