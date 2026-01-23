import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useQueue } from '../use-queue';
import { createTestStore } from './test-utils';

describe('useQueue', () => {
  it('returns tasks record', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useQueue(store));

    expect(result.current).toEqual({});
  });

  it('updates when task completes', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useQueue(store));

    expect(result.current.setVolume).toBeUndefined();

    await act(async () => {
      await store.request.setVolume(0.5);
    });

    expect(result.current.setVolume).toBeDefined();
    expect(result.current.setVolume?.status).toBe('success');
  });
});
