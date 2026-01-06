import { act, renderHook } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { useMutation } from '../use-mutation';
import { createAsyncTestStore, createTestStore } from './test-utils';

describe('useMutation', () => {
  it('returns mutation result with idle status initially', () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useMutation(store, 'setVolume'));

    expect(result.current.status).toBe('idle');
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('updates to success status after successful mutation', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useMutation(store, 'setVolume'));

    await act(async () => {
      await result.current.mutate(0.5);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe(0.5);
    }
  });

  it('updates to error status after failed mutation', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useMutation(store, 'failingRequest'));

    await act(async () => {
      try {
        await result.current.mutate();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Request failed');
    }
  });

  it('reset clears settled state', async () => {
    const { store } = createAsyncTestStore();

    const { result } = renderHook(() => useMutation(store, 'setVolume'));

    await act(async () => {
      await result.current.mutate(0.5);
    });

    expect(result.current.status).toBe('success');

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
  });

  it('re-renders only when task status changes', async () => {
    const { store } = createAsyncTestStore();
    const renderCount = vi.fn();

    const { result } = renderHook(() => {
      renderCount();
      return useMutation(store, 'setVolume');
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

    const { result, rerender } = renderHook(() => useMutation(store, 'setVolume'));

    const firstMutate = result.current.mutate;
    rerender();

    expect(result.current.mutate).toBe(firstMutate);
  });

  it('works with synchronous requests', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useMutation(store, 'setVolume'));

    await act(async () => {
      await result.current.mutate(0.5);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe(0.5);
    }
  });
});
