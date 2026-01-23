import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStore } from '../use-store';
import { createTestStore } from './test-utils';

describe('useStore', () => {
  it('returns state snapshot', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store));

    expect(result.current.volume).toBe(1);
    expect(result.current.muted).toBe(false);
  });

  it('updates when state changes', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store));

    expect(result.current.volume).toBe(1);

    await act(async () => {
      await store.request.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });
});
