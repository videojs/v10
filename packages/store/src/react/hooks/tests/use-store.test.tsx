import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStore } from '../use-store';
import { createTestStore } from './test-utils';

interface AudioState {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => Promise<number>;
  setMuted: (muted: boolean) => Promise<boolean>;
}

describe('useStore', () => {
  it('returns state and action functions spread together', () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store) as AudioState);

    expect(result.current.volume).toBe(1);
    expect(result.current.muted).toBe(false);
    expect(typeof result.current.setVolume).toBe('function');
  });

  it('updates when state changes', async () => {
    const { store } = createTestStore();

    const { result } = renderHook(() => useStore(store) as AudioState);

    expect(result.current.volume).toBe(1);

    await act(async () => {
      await result.current.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });
});
