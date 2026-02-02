import { describe, expect, it } from 'vitest';
import { createSelector } from '../selector';
import { defineSlice } from '../slice';

interface MockMedia {
  volume: number;
}

describe('createSelector', () => {
  const volumeSlice = defineSlice<MockMedia>()({
    state: ({ task }) => ({
      volume: 1,
      muted: false,
      setVolume(value: number) {
        return task(({ target }) => {
          target.volume = value;
          return value;
        });
      },
    }),
  });

  const playbackSlice = defineSlice<MockMedia>()({
    state: () => ({
      paused: true,
      ended: false,
    }),
  });

  it('selects slice state from store state', () => {
    const selectVolume = createSelector(volumeSlice);
    const state = { volume: 0.5, muted: true, setVolume: () => Promise.resolve(0.5) };

    const selected = selectVolume(state);

    expect(selected).toEqual({
      volume: 0.5,
      muted: true,
      setVolume: state.setVolume,
    });
  });

  it('returns undefined when slice is not configured', () => {
    const selectVolume = createSelector(volumeSlice);
    const state = { paused: true, ended: false }; // No volume keys

    const selected = selectVolume(state);

    expect(selected).toBeUndefined();
  });

  it('creates separate selectors for different slices', () => {
    const selectVolume = createSelector(volumeSlice);
    const selectPlayback = createSelector(playbackSlice);
    const state = {
      volume: 0.75,
      muted: false,
      setVolume: () => Promise.resolve(0.75),
      paused: false,
      ended: false,
    };

    const volume = selectVolume(state);
    const playback = selectPlayback(state);

    expect(volume).toEqual({
      volume: 0.75,
      muted: false,
      setVolume: state.setVolume,
    });
    expect(playback).toEqual({
      paused: false,
      ended: false,
    });
  });

  it('returns stable references when state values are the same', () => {
    const selectVolume = createSelector(volumeSlice);
    const setVolume = () => Promise.resolve(1);
    const state1 = { volume: 1, muted: false, setVolume };
    const state2 = { volume: 1, muted: false, setVolume };

    const selected1 = selectVolume(state1);
    const selected2 = selectVolume(state2);

    // Different object references (new object created each call)
    expect(selected1).not.toBe(selected2);
    // But structurally equal (for shallowEqual comparison)
    expect(selected1).toEqual(selected2);
  });
});
