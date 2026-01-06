import { act, renderHook } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { useOptimistic } from '../use-optimistic';
import { createAsyncTestStore, createCustomKeyTestStore, createTestStore } from './test-utils';

describe('useOptimistic', () => {
  it('returns actual value initially with idle status', () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    expect(result.current.value).toBe(1);
    expect(result.current.status).toBe('idle');
    expect(typeof result.current.setValue).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('shows optimistic value immediately while pending', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'slowSetVolume', s => s.volume));

    // Start the request but don't await
    let promise: Promise<number>;
    act(() => {
      promise = result.current.setValue(0.3);
    });

    // Optimistic value shown immediately
    expect(result.current.value).toBe(0.3);

    // Wait for task to start
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.status).toBe('pending');
    expect(result.current.value).toBe(0.3);

    // Wait for completion
    await act(async () => {
      await promise;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.value).toBe(0.3);
  });

  it('updates to actual value after mutation completes', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    await act(async () => {
      await result.current.setValue(0.5);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.value).toBe(0.5);
  });

  it('reverts to actual value on error', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'failingSetVolume', s => s.volume));

    // Start the request
    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.setValue(0.5);
    });

    // Optimistic value shown immediately
    expect(result.current.value).toBe(0.5);

    // Wait for error
    await act(async () => {
      try {
        await promise;
      } catch {
        // Expected
      }
    });

    // After error, shows actual value (reverted) and error status
    expect(result.current.status).toBe('error');
    expect(result.current.value).toBe(1); // Original value
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(Error);
    }
  });

  it('reset clears optimistic state', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    await act(async () => {
      await result.current.setValue(0.5);
    });

    expect(result.current.status).toBe('success');

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.value).toBe(0.5); // Actual value after successful mutation
  });

  it('reset when idle is safe', () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    expect(result.current.status).toBe('idle');

    // Reset when idle should not throw
    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.value).toBe(1);
  });

  it('triggers re-render when state changes externally', async () => {
    const { store, target } = createAsyncTestStore();
    const renderCount = vi.fn();

    const { result } = renderHook(() => {
      renderCount();
      return useOptimistic(store, 'setVolume', s => s.volume);
    });

    expect(renderCount).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe(1);

    // Change volume externally
    await act(async () => {
      target.volume = 0.8;
      target.dispatchEvent(new Event('volumechange'));
    });

    expect(renderCount.mock.calls.length).toBeGreaterThan(1);
    expect(result.current.value).toBe(0.8);
  });

  it('handles rapid setValue calls (superseding)', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'slowSetVolume', s => s.volume));

    // Fire multiple rapid calls
    let promise1: Promise<number>;
    let promise2: Promise<number>;
    let promise3: Promise<number>;

    act(() => {
      promise1 = result.current.setValue(0.3);
      promise2 = result.current.setValue(0.5);
      promise3 = result.current.setValue(0.7);
    });

    // Should show latest optimistic value
    expect(result.current.value).toBe(0.7);

    // First two get superseded
    await act(async () => {
      await expect(promise1).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await expect(promise2).rejects.toMatchObject({ code: 'SUPERSEDED' });
      await promise3;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.value).toBe(0.7);
  });

  it('setValue function is stable across renders', () => {
    const { store } = createAsyncTestStore();

    const { result, rerender } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    const firstSetValue = result.current.setValue;
    rerender();

    expect(result.current.setValue).toBe(firstSetValue);
  });

  it('works with synchronous requests', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useOptimistic(store, 'setVolume', s => s.volume));

    await act(async () => {
      await result.current.setValue(0.5);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.value).toBe(0.5);
  });

  describe('custom key (name !== key)', () => {
    it('tracks task by name when key differs', async () => {
      const { store } = createCustomKeyTestStore();

      // adjustVolume has name='adjustVolume' but key='audio-settings'
      const { result } = renderHook(() => useOptimistic(store, 'adjustVolume', s => s.volume));

      let promise: Promise<number>;
      act(() => {
        promise = result.current.setValue(0.5);
      });

      // Optimistic value shown immediately
      expect(result.current.value).toBe(0.5);

      // Wait for task to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });

      expect(result.current.status).toBe('pending');

      await act(async () => {
        await promise;
      });

      expect(result.current.status).toBe('success');
      expect(result.current.value).toBe(0.5);
    });

    it('tracks correct task when multiple requests share same key', async () => {
      const { store } = createCustomKeyTestStore();

      // Both adjustVolume and toggleMute have key='audio-settings'
      const { result: volumeResult } = renderHook(() => useOptimistic(store, 'adjustVolume', s => s.volume));

      const { result: muteResult } = renderHook(() => useOptimistic(store, 'toggleMute', s => s.muted));

      // Start volume adjustment
      let volumePromise: Promise<number>;
      act(() => {
        volumePromise = volumeResult.current.setValue(0.5);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });

      // Volume controller should be pending
      expect(volumeResult.current.status).toBe('pending');
      expect(volumeResult.current.value).toBe(0.5); // Optimistic

      // Mute controller should be idle (different name, even though same key)
      expect(muteResult.current.status).toBe('idle');
      expect(muteResult.current.value).toBe(false); // Actual

      await act(async () => {
        await volumePromise;
      });

      expect(volumeResult.current.status).toBe('success');
      expect(muteResult.current.status).toBe('idle');
    });

    it('superseded task shows error status', async () => {
      const { store } = createCustomKeyTestStore();

      const { result: volumeResult } = renderHook(() => useOptimistic(store, 'adjustVolume', s => s.volume));

      const { result: muteResult } = renderHook(() => useOptimistic(store, 'toggleMute', s => s.muted));

      // Start volume adjustment
      let volumePromise: Promise<number>;
      act(() => {
        volumePromise = volumeResult.current.setValue(0.5);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });

      // Start mute toggle - this will supersede volume because same key
      let mutePromise: Promise<boolean>;
      act(() => {
        mutePromise = muteResult.current.setValue(true);
      });

      // Mute shows optimistic immediately
      expect(muteResult.current.value).toBe(true);

      // Volume task was superseded
      await act(async () => {
        try {
          await volumePromise;
        } catch {
          // Expected - task was superseded
        }
      });

      // Wait for subscription callbacks to fire
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Tasks are keyed by name, so superseded task shows error status
      expect(volumeResult.current.status).toBe('error');

      // Complete the mute operation
      await act(async () => {
        await mutePromise;
      });

      expect(muteResult.current.status).toBe('success');
    });
  });
});
