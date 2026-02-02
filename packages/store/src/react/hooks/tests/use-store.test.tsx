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
  describe('without selector', () => {
    it('returns state and action functions', () => {
      const { store } = createTestStore();

      const { result } = renderHook(() => useStore(store) as AudioState);

      expect(result.current.volume).toBe(1);
      expect(result.current.muted).toBe(false);
      expect(typeof result.current.setVolume).toBe('function');
    });

    it('does not re-render on state change', async () => {
      const { store } = createTestStore();
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useStore(store) as AudioState;
      });

      expect(renderCount).toBe(1);
      expect(result.current.volume).toBe(1);

      await act(async () => {
        await result.current.setVolume(0.5);
      });

      // Should NOT have re-rendered (equality always returns true)
      expect(renderCount).toBe(1);
      // But state DID change - just not reflected in result.current
      expect(store.state.volume).toBe(0.5);
    });
  });

  describe('with selector', () => {
    it('re-renders when selected state changes', async () => {
      const { store } = createTestStore();
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useStore(store, (s: AudioState) => s.volume);
      });

      expect(renderCount).toBe(1);
      expect(result.current).toBe(1);

      await act(async () => {
        await (store as unknown as AudioState).setVolume(0.5);
      });

      // Should have re-rendered
      expect(renderCount).toBe(2);
      expect(result.current).toBe(0.5);
    });

    it('does not re-render when unrelated state changes', async () => {
      const { store } = createTestStore();
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useStore(store, (s: AudioState) => s.volume);
      });

      expect(renderCount).toBe(1);

      await act(async () => {
        await (store as unknown as AudioState).setMuted(true);
      });

      // Should NOT re-render since volume didn't change
      expect(renderCount).toBe(1);
      expect(result.current).toBe(1);
    });
  });
});
