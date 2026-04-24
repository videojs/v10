import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import { type PlaybackRateOwners, type PlaybackRateState, trackPlaybackRate } from '../track-playback-rate';

function setupTrackPlaybackRate(initialState: PlaybackRateState = {}, initialOwners: PlaybackRateOwners = {}) {
  const state = signal<PlaybackRateState>(initialState);
  const owners = signal<PlaybackRateOwners>(initialOwners);
  const cleanup = trackPlaybackRate({ state, owners });
  return { state, owners, cleanup };
}

describe('trackPlaybackRate', () => {
  it('syncs playbackRate immediately when mediaElement is provided', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => {
      expect(state.get().playbackRate).toBe(1);
    });

    cleanup();
  });

  it('updates playbackRate on ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));

    await vi.waitFor(() => {
      expect(state.get().playbackRate).toBe(2);
    });

    cleanup();
  });

  it('continues tracking on subsequent ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 0.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.get().playbackRate).toBe(0.5));

    mediaElement.playbackRate = 1.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.get().playbackRate).toBe(1.5));

    cleanup();
  });

  it('does nothing when no mediaElement', async () => {
    const { state, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.get().playbackRate).toBeUndefined();

    cleanup();
  });

  it('continues tracking correctly after owners updates with unchanged mediaElement', async () => {
    const mediaElement = document.createElement('video');
    const ratechangeHandler = vi.fn();
    mediaElement.addEventListener('ratechange', ratechangeHandler);

    const { state, owners, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.get().playbackRate).toBe(1));

    // Spread owners without changing mediaElement — effect may re-setup but no duplicate handling
    owners.set({ ...owners.get() });
    await new Promise((resolve) => setTimeout(resolve, 30));

    // ratechange should still update state exactly once
    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));

    await vi.waitFor(() => expect(state.get().playbackRate).toBe(2));

    cleanup();
  });

  it('starts tracking when mediaElement is added later', async () => {
    const { state, owners, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.get().playbackRate).toBeUndefined();

    const mediaElement = document.createElement('video');
    owners.set({ ...owners.get(), mediaElement });

    await vi.waitFor(() => {
      expect(state.get().playbackRate).toBe(1);
    });

    cleanup();
  });

  it('stops listening to old mediaElement when replaced', async () => {
    const element1 = document.createElement('video');
    const element2 = document.createElement('video');

    const { state, owners, cleanup } = setupTrackPlaybackRate({}, { mediaElement: element1 });

    await vi.waitFor(() => expect(state.get().playbackRate).toBe(1));

    owners.set({ ...owners.get(), mediaElement: element2 });
    await vi.waitFor(() => expect(state.get().playbackRate).toBe(1));

    // Old element ratechange should no longer affect state
    element1.playbackRate = 3;
    element1.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().playbackRate).toBe(1);

    cleanup();
  });

  it('removes ratechange listener on cleanup', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.get().playbackRate).toBe(1));

    cleanup();

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().playbackRate).toBe(1);
  });
});
