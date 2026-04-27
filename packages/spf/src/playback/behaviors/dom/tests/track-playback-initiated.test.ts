import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  type PlaybackInitiatedOwners,
  type PlaybackInitiatedState,
  trackPlaybackInitiated,
} from '../track-playback-initiated';

function setupTrackPlaybackInitiated(
  initialState: PlaybackInitiatedState = {},
  initialOwners: PlaybackInitiatedOwners = {}
) {
  const state = signal<PlaybackInitiatedState>(initialState);
  const owners = signal<PlaybackInitiatedOwners>(initialOwners);
  const reactor = trackPlaybackInitiated({ state, owners });
  return { state, owners, reactor };
}

/** Creates a video element with a controllable `paused` state. */
function makeMediaElement(initiallyPaused = true) {
  const el = document.createElement('video');
  let paused = initiallyPaused;
  Object.defineProperty(el, 'paused', { get: () => paused, configurable: true });
  return {
    el,
    play() {
      paused = false;
      el.dispatchEvent(new Event('play'));
    },
    pause() {
      paused = true;
    },
  };
}

describe('trackPlaybackInitiated', () => {
  it('sets playbackInitiated to true when mediaElement fires play event', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.get().playbackInitiated).toBe(true);
    reactor.destroy();
  });

  it('sets playbackInitiated to true immediately if element is already playing', async () => {
    const { el } = makeMediaElement(false);
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.get().playbackInitiated).toBe(true);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when presentation URL changes', async () => {
    const { el, play, pause } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream1.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    // Simulate source change: element pauses as new media loads.
    pause();
    state.set({ ...state.get(), presentationUrl: 'http://example.com/stream2.m3u8' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when the media element is swapped', async () => {
    const { el, play } = makeMediaElement();
    const { state, owners, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    // New element starts paused.
    owners.set({ ...owners.get(), mediaElement: document.createElement('video') });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when element is removed', async () => {
    const { el, play } = makeMediaElement();
    const { state, owners, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    owners.set({ ...owners.get(), mediaElement: undefined });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when URL is cleared', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    state.set({ ...state.get(), presentationUrl: undefined });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('does not reset playbackInitiated on unrelated state changes', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    state.set({ ...state.get(), presentationUrl: 'http://example.com/stream.m3u8' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(true);
    reactor.destroy();
  });

  it('does not re-attach listener on unrelated owner changes', async () => {
    const { el } = makeMediaElement();
    const addEventListenerSpy = vi.spyOn(el, 'addEventListener');

    const { owners, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream.m3u8' },
      { mediaElement: el }
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    const callsBefore = addEventListenerSpy.mock.calls.length;

    owners.set({ ...owners.get(), videoBuffer: {} } as PlaybackInitiatedOwners & { videoBuffer?: unknown });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    reactor.destroy();
  });

  it('stops tracking after destroy', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentationUrl: 'http://example.com/stream1.m3u8' },
      { mediaElement: el }
    );

    reactor.destroy();

    play();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBeFalsy();
  });
});
