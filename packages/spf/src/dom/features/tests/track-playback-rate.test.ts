import { describe, expect, it, vi } from 'vitest';
import { stateToSignal } from '../../../core/signals/bridge';
import { createState } from '../../../core/state/create-state';
import { type PlaybackRateOwners, type PlaybackRateState, trackPlaybackRate } from '../track-playback-rate';

function setupTrackPlaybackRate(initialState: PlaybackRateState = {}, initialOwners: PlaybackRateOwners = {}) {
  const state = createState<PlaybackRateState>(initialState);
  const owners = createState<PlaybackRateOwners>(initialOwners);
  const [ownersSignal, cleanupOwners] = stateToSignal(owners);
  const cleanupEffect = trackPlaybackRate({ state, owners: ownersSignal });
  return {
    state,
    owners,
    cleanup: () => {
      cleanupEffect();
      cleanupOwners();
    },
  };
}

describe('trackPlaybackRate', () => {
  it('syncs playbackRate immediately when mediaElement is provided', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => {
      expect(state.current.playbackRate).toBe(1);
    });

    cleanup();
  });

  it('updates playbackRate on ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));

    await vi.waitFor(() => {
      expect(state.current.playbackRate).toBe(2);
    });

    cleanup();
  });

  it('continues tracking on subsequent ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 0.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.current.playbackRate).toBe(0.5));

    mediaElement.playbackRate = 1.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.current.playbackRate).toBe(1.5));

    cleanup();
  });

  it('does nothing when no mediaElement', async () => {
    const { state, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.playbackRate).toBeUndefined();

    cleanup();
  });

  it('does not re-setup when owners updates but mediaElement is unchanged', async () => {
    const mediaElement = document.createElement('video');
    const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

    const { state, owners, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

    const callsBefore = addEventListenerSpy.mock.calls.length;

    // Patch an unrelated owner — mediaElement is the same object
    owners.patch({ videoBuffer: {} });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

    cleanup();
  });

  it('starts tracking when mediaElement is added later', async () => {
    const { state, owners, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.current.playbackRate).toBeUndefined();

    const mediaElement = document.createElement('video');
    owners.patch({ mediaElement });

    await vi.waitFor(() => {
      expect(state.current.playbackRate).toBe(1);
    });

    cleanup();
  });

  it('stops listening to old mediaElement when replaced', async () => {
    const element1 = document.createElement('video');
    const element2 = document.createElement('video');

    const { state, owners, cleanup } = setupTrackPlaybackRate({}, { mediaElement: element1 });

    await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

    owners.patch({ mediaElement: element2 });
    await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

    // Old element ratechange should no longer affect state
    element1.playbackRate = 3;
    element1.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.current.playbackRate).toBe(1);

    cleanup();
  });

  it('removes ratechange listener on cleanup', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.current.playbackRate).toBe(1));

    cleanup();

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.current.playbackRate).toBe(1);
  });
});
