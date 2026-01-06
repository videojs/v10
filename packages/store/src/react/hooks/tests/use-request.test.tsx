import { renderHook } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { useRequest } from '../use-request';
import { createTestStore } from './test-utils';

describe('useRequest', () => {
  it('returns request map', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useRequest(store));

    expect(result.current).toHaveProperty('setVolume');
    expect(result.current).toHaveProperty('setMuted');
    expect(typeof result.current.setVolume).toBe('function');
  });

  it('returns request by name', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useRequest(store, 'setVolume'));

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
