import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { combine } from '../combine';
import { createSelector } from '../selector';
import { defineSlice } from '../slice';
import { createStore } from '../store';

const NativeAbortController = globalThis.AbortController;

interface MockMedia {
  volume: number;
}

describe('createSelector', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const volumeSlice = defineSlice<MockMedia>()({
    name: 'volume',
    state: ({ target }) => ({
      volume: 1,
      muted: false,
      setVolume(value: number) {
        target().volume = value;
        return value;
      },
    }),
  });

  const playbackSlice = defineSlice<MockMedia>()({
    name: 'playback',
    state: () => ({
      paused: true,
      ended: false,
    }),
  });

  it('selects slice state from store state', () => {
    const selectVolume = createSelector(volumeSlice);
    const state = { volume: 0.5, muted: true, setVolume: () => 0.5 };

    const selected = selectVolume(state);

    expect(selected).toEqual({
      volume: 0.5,
      muted: true,
      setVolume: state.setVolume,
    });
  });

  it('selects a slice configured directly in a store', () => {
    const selectVolume = createSelector(volumeSlice);
    const store = createStore<MockMedia>()(volumeSlice);

    expect(selectVolume(store.state)).toEqual({
      volume: 1,
      muted: false,
      setVolume: store.setVolume,
    });
  });

  it('selects from replacement snapshots', () => {
    const countSlice = defineSlice<MockMedia>()({
      state: ({ set }) => ({
        count: 0,
        setCount: (count: number) => set({ count }),
      }),
    });
    const selectCount = createSelector(countSlice);
    const store = createStore<MockMedia>()(countSlice);

    store.setCount(1);

    expect(selectCount(store.state)).toEqual({ count: 1, setCount: store.setCount });
    expect(Object.getOwnPropertySymbols(store.state)).toEqual([]);
  });

  it('returns undefined when store keys overlap an unconfigured slice', () => {
    const sameShapeSlice = defineSlice<MockMedia>()({
      name: 'same-shape',
      state: () => ({
        volume: 0.25,
        muted: true,
        setVolume: (value: number) => value,
      }),
    });
    const store = createStore<MockMedia>()(sameShapeSlice);

    expect(createSelector(volumeSlice)(store.state)).toBeUndefined();
    expect(createSelector(sameShapeSlice)(store.state)).toEqual({
      volume: 0.25,
      muted: true,
      setVolume: store.setVolume,
    });
  });

  it('warns once when store keys match a slice the store was not built from', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const lookalike = defineSlice<MockMedia>()({
      state: () => ({ volume: 1, muted: false, setVolume: (value: number) => value }),
    });
    const store = createStore<MockMedia>()(lookalike);
    const selectVolume = createSelector(volumeSlice);

    selectVolume(store.state);
    selectVolume(store.state);

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toContain('slice "volume"');
    warn.mockRestore();
  });

  it('falls back to key detection for a copied store snapshot', () => {
    const selectVolume = createSelector(volumeSlice);
    const store = createStore<MockMedia>()(volumeSlice);

    expect(selectVolume({ ...store.state })).toEqual({
      volume: 1,
      muted: false,
      setVolume: store.setVolume,
    });
  });

  it('selects leaf and combined slices from a combined store', () => {
    const combinedSlice = combine(volumeSlice, playbackSlice);
    const store = createStore<MockMedia>()(combinedSlice);

    expect(createSelector(volumeSlice)(store.state)).toEqual({
      volume: 1,
      muted: false,
      setVolume: store.setVolume,
    });
    expect(createSelector(playbackSlice)(store.state)).toEqual({ paused: true, ended: false });
    expect(createSelector(combinedSlice)(store.state)).toEqual({
      volume: 1,
      muted: false,
      setVolume: store.setVolume,
      paused: true,
      ended: false,
    });
  });

  it('selects leaf slices through nested combinations', () => {
    const presentationSlice = defineSlice<MockMedia>()({ state: () => ({ fullscreen: false }) });
    const mediaSlice = combine(volumeSlice, playbackSlice);
    const store = createStore<MockMedia>()(combine(mediaSlice, presentationSlice));

    expect(createSelector(volumeSlice)(store.state)).toBeDefined();
    expect(createSelector(mediaSlice)(store.state)).toBeDefined();
    expect(createSelector(presentationSlice)(store.state)).toEqual({ fullscreen: false });
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
      setVolume: () => 0.75,
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
    const setVolume = () => 1;
    const state1 = { volume: 1, muted: false, setVolume };
    const state2 = { volume: 1, muted: false, setVolume };

    const selected1 = selectVolume(state1);
    const selected2 = selectVolume(state2);

    // Different object references (new object created each call)
    expect(selected1).not.toBe(selected2);
    // But structurally equal (for shallowEqual comparison)
    expect(selected1).toEqual(selected2);
  });

  it('exposes displayName from slice name', () => {
    const selectVolume = createSelector(volumeSlice);

    expect(selectVolume.displayName).toBe('volume');
  });

  it('omits displayName when slice has no name', () => {
    const unnamedSlice = defineSlice<MockMedia>()({
      state: () => ({ paused: true }),
    });
    const selector = createSelector(unnamedSlice);

    expect(selector.displayName).toBeUndefined();
  });

  it('selects an empty slice only from a store built with it', () => {
    const emptySlice = defineSlice<MockMedia>()({
      name: 'empty',
      state: () => ({}),
    });
    const selector = createSelector(emptySlice);
    const store = createStore<MockMedia>()(combine(emptySlice, playbackSlice));

    expect(selector({})).toBeUndefined();
    expect(selector(store.state)).toEqual({});
    expect(selector.displayName).toBe('empty');
  });

  // Runtimes such as Cloudflare Workers throw when I/O-bound objects are created during
  // module evaluation. See https://github.com/videojs/v10/issues/2041.
  it('does not construct an AbortController on module evaluation', async () => {
    let constructed = 0;

    class CountingAbortController extends NativeAbortController {
      constructor() {
        super();
        constructed++;
      }
    }

    vi.stubGlobal('AbortController', CountingAbortController);
    vi.resetModules();

    await import('../selector');

    expect(constructed).toBe(0);
  });
});
