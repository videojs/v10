import { act, renderHook } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { createSlice } from '../../core/slice';
import { createStore as createCoreStore } from '../../core/store';
import { useMutation, useRequest, useSelector, useTasks } from '../hooks';

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

  describe('useMutation', () => {
    // Create a slice with async requests for testing pending states
    class AsyncMockMedia extends EventTarget {
      volume = 1;
      muted = false;
    }

    const asyncAudioSlice = createSlice<AsyncMockMedia>()({
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
        setVolume: {
          handler: async (volume: number, { target }) => {
            // Simulate async operation
            await Promise.resolve();
            target.volume = volume;
            target.dispatchEvent(new Event('volumechange'));
            return volume;
          },
        },
        failingRequest: {
          handler: async () => {
            await Promise.resolve();
            throw new Error('Request failed');
          },
        },
      },
    });

    function createAsyncTestStore() {
      const store = createCoreStore({ slices: [asyncAudioSlice] });
      const target = new AsyncMockMedia();
      store.attach(target);
      return { store, target };
    }

    it('returns mutation result with idle status initially', () => {
      const { store } = createAsyncTestStore();

      const { result } = renderHook(() => useMutation(store, r => r.setVolume));

      expect(result.current.status).toBe('idle');
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
      expect(typeof result.current.mutate).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('updates to success status after successful mutation', async () => {
      const { store } = createAsyncTestStore();

      const { result } = renderHook(() => useMutation(store, r => r.setVolume));

      await act(async () => {
        await result.current.mutate(0.5);
      });

      expect(result.current.status).toBe('success');
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBe(0.5);
      expect(result.current.error).toBeUndefined();
    });

    it('updates to error status after failed mutation', async () => {
      const { store } = createAsyncTestStore();

      const { result } = renderHook(() => useMutation(store, r => r.failingRequest));

      await act(async () => {
        try {
          await result.current.mutate();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.status).toBe('error');
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Request failed');
    });

    it('reset clears settled state', async () => {
      const { store } = createAsyncTestStore();

      const { result } = renderHook(() => useMutation(store, r => r.setVolume));

      await act(async () => {
        await result.current.mutate(0.5);
      });

      expect(result.current.status).toBe('success');

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.data).toBeUndefined();
    });

    it('re-renders only when task status changes', async () => {
      const { store } = createAsyncTestStore();
      const renderCount = vi.fn();

      const { result } = renderHook(() => {
        renderCount();
        return useMutation(store, r => r.setVolume);
      });

      expect(renderCount).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.mutate(0.5);
      });

      // Should have re-rendered for pending and success
      expect(renderCount.mock.calls.length).toBeGreaterThan(1);
    });

    it('mutate function is stable across renders', () => {
      const { store } = createAsyncTestStore();

      const { result, rerender } = renderHook(() => useMutation(store, r => r.setVolume));

      const firstMutate = result.current.mutate;
      rerender();

      expect(result.current.mutate).toBe(firstMutate);
    });

    it('works with synchronous requests', async () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useMutation(store, r => r.setVolume));

      await act(async () => {
        await result.current.mutate(0.5);
      });

      expect(result.current.status).toBe('success');
      expect(result.current.data).toBe(0.5);
    });
  });
});
