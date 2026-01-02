import { describe, expect, it } from 'vitest';

import { getSelectorKeys } from './selector';

describe('getSelectorKeys', () => {
  interface State {
    volume: number;
    muted: boolean;
    currentTime: number;
  }

  const state: State = { volume: 1, muted: false, currentTime: 0 };

  it('extracts keys from object selector result', () => {
    const selector = (s: State) => ({ volume: s.volume, muted: s.muted });
    expect(getSelectorKeys(selector, state)).toEqual(['volume', 'muted']);
  });

  it('extracts single key', () => {
    const selector = (s: State) => ({ volume: s.volume });
    expect(getSelectorKeys(selector, state)).toEqual(['volume']);
  });

  it('returns null for primitive selector result (number)', () => {
    const selector = (s: State) => s.volume;
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns null for primitive selector result (boolean)', () => {
    const selector = (s: State) => s.muted;
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns null for primitive selector result (string)', () => {
    const selector = () => 'hello';
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns null for array selector result', () => {
    const selector = (s: State) => [s.volume, s.muted];
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns null for null selector result', () => {
    const selector = () => null;
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns null for undefined selector result', () => {
    const selector = () => undefined;
    expect(getSelectorKeys(selector, state)).toBeNull();
  });

  it('returns empty array for empty object selector', () => {
    const selector = () => ({});
    expect(getSelectorKeys(selector, state)).toEqual([]);
  });

  it('handles derived/computed properties in selector', () => {
    const selector = (s: State) => ({
      volumePercent: Math.round(s.volume * 100),
      isMuted: s.muted,
    });

    // Returns the result object's keys, not the state keys accessed
    expect(getSelectorKeys(selector, state)).toEqual(['volumePercent', 'isMuted']);
  });

  it('handles selector that accesses nested state', () => {
    interface NestedState {
      audio: { volume: number; muted: boolean };
      video: { quality: string };
    }

    const nestedState: NestedState = {
      audio: { volume: 1, muted: false },
      video: { quality: 'hd' },
    };

    const selector = (s: NestedState) => ({ audio: s.audio });
    expect(getSelectorKeys(selector, nestedState)).toEqual(['audio']);
  });
});
