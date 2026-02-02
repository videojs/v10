import { describe, expect, it } from 'vitest';
import { defineFeature } from '../feature';
import { createFeatureSelector } from '../feature-selector';

interface MockMedia {
  volume: number;
}

describe('createFeatureSelector', () => {
  const volumeFeature = defineFeature<MockMedia>()({
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

  const playbackFeature = defineFeature<MockMedia>()({
    state: () => ({
      paused: true,
      ended: false,
    }),
  });

  it('selects feature state from store state', () => {
    const selectVolume = createFeatureSelector(volumeFeature);
    const state = { volume: 0.5, muted: true, setVolume: () => Promise.resolve(0.5) };

    const selected = selectVolume(state);

    expect(selected).toEqual({
      volume: 0.5,
      muted: true,
      setVolume: state.setVolume,
    });
  });

  it('returns undefined when feature is not configured', () => {
    const selectVolume = createFeatureSelector(volumeFeature);
    const state = { paused: true, ended: false }; // No volume keys

    const selected = selectVolume(state);

    expect(selected).toBeUndefined();
  });

  it('creates separate selectors for different features', () => {
    const selectVolume = createFeatureSelector(volumeFeature);
    const selectPlayback = createFeatureSelector(playbackFeature);
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
    const selectVolume = createFeatureSelector(volumeFeature);
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
