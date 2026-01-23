import { describe, expect, it, vi } from 'vitest';

import { Computed } from '../computed';
import { createState, flush } from '../state';

describe('computed', () => {
  interface TestState {
    volume: number;
    muted: boolean;
    currentTime: number;
  }

  const createTestState = () =>
    createState<TestState>({
      volume: 1,
      muted: false,
      currentTime: 0,
    });

  describe('current', () => {
    it('returns derived value', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));

      expect(effectiveVolume.current).toBe(1);
    });

    it('updates when dependency changes', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));

      expect(effectiveVolume.current).toBe(1);

      state.set('muted', true);
      flush();

      expect(effectiveVolume.current).toBe(0);
    });

    it('updates when volume changes', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));

      state.set('volume', 0.5);
      flush();

      expect(effectiveVolume.current).toBe(0.5);
    });

    it('does not recompute when unrelated keys change', () => {
      const state = createTestState();
      const deriveFn = vi.fn(({ volume, muted }: Pick<TestState, 'volume' | 'muted'>) => (muted ? 0 : volume));
      const effectiveVolume = new Computed(state, ['volume', 'muted'], deriveFn);

      // Initial access triggers first computation
      void effectiveVolume.current;
      expect(deriveFn).toHaveBeenCalledTimes(1);

      // Changing unrelated key should not recompute
      state.set('currentTime', 10);
      flush();

      void effectiveVolume.current;
      expect(deriveFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('notifies when computed value changes', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));
      const listener = vi.fn();

      effectiveVolume.subscribe(listener);

      state.set('muted', true);
      flush();

      expect(listener).toHaveBeenCalledOnce();
    });

    it('does not notify when computed value stays the same', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));
      const listener = vi.fn();

      // Access to initialize
      void effectiveVolume.current;
      effectiveVolume.subscribe(listener);

      // Already muted=false, volume=1, effective=1
      // Setting volume to same value shouldn't even trigger state change
      state.set('volume', 1);
      flush();

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not notify when dependency changes but computed result is same', () => {
      const state = createTestState();
      // When muted, effective volume is always 0 regardless of volume value
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));
      const listener = vi.fn();

      // Mute first
      state.set('muted', true);
      flush();

      // Access to initialize (should be 0)
      expect(effectiveVolume.current).toBe(0);
      effectiveVolume.subscribe(listener);

      // Change volume while muted - computed stays 0
      state.set('volume', 0.5);
      flush();

      expect(effectiveVolume.current).toBe(0);
      expect(listener).not.toHaveBeenCalled();
    });

    it('returns unsubscribe function', () => {
      const state = createTestState();
      const effectiveVolume = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => (muted ? 0 : volume));
      const listener = vi.fn();

      const unsub = effectiveVolume.subscribe(listener);

      state.set('muted', true);
      flush();
      expect(listener).toHaveBeenCalledOnce();

      unsub();

      state.set('muted', false);
      flush();
      expect(listener).toHaveBeenCalledOnce(); // still 1
    });
  });

  describe('edge cases', () => {
    it('works with single key dependency', () => {
      const state = createTestState();
      const doubleVolume = new Computed(state, ['volume'], ({ volume }) => volume * 2);

      expect(doubleVolume.current).toBe(2);

      state.set('volume', 0.5);
      flush();

      expect(doubleVolume.current).toBe(1);
    });

    it('handles object return values', () => {
      const state = createTestState();
      const volumeInfo = new Computed(state, ['volume', 'muted'], ({ volume, muted }) => ({
        effective: muted ? 0 : volume,
        display: muted ? 'Muted' : `${Math.round(volume * 100)}%`,
      }));

      expect(volumeInfo.current).toEqual({
        effective: 1,
        display: '100%',
      });

      state.set('muted', true);
      flush();

      expect(volumeInfo.current).toEqual({
        effective: 0,
        display: 'Muted',
      });
    });

    it('lazy initialization - does not compute until accessed', () => {
      const state = createTestState();
      const deriveFn = vi.fn(({ volume }: Pick<TestState, 'volume'>) => volume * 2);

      const _ = new Computed(state, ['volume'], deriveFn);
      void _; // intentionally unused - testing lazy init

      expect(deriveFn).not.toHaveBeenCalled();
    });
  });
});
