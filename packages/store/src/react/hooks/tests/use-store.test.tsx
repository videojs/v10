import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStore } from '../use-store';
import { createTestStore } from './test-utils';

describe('useStore', () => {
  it('returns state snapshot with request', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store));

    expect(result.current.volume).toBe(1);
    expect(result.current.muted).toBe(false);
    expect(result.current.request).toBeDefined();
    expect(typeof result.current.request.setVolume).toBe('function');
  });

  it('updates when state changes', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store));

    expect(result.current.volume).toBe(1);

    await act(async () => {
      await result.current.request.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });
});
