import { act, renderHook } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';

import { useSelector } from '../use-selector';
import { createTestStore } from './test-utils';

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
