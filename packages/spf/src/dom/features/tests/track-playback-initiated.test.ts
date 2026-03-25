import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../../core/events/create-event-stream';
import type { PresentationAction } from '../../../core/features/resolve-presentation';
import { stateToSignal } from '../../../core/signals/bridge';
import { createState } from '../../../core/state/create-state';
import {
  type PlaybackInitiatedOwners,
  type PlaybackInitiatedState,
  trackPlaybackInitiated,
} from '../track-playback-initiated';

function setupTrackPlaybackInitiated(
  initialState: PlaybackInitiatedState = {},
  initialOwners: PlaybackInitiatedOwners = {}
) {
  const state = createState<PlaybackInitiatedState>(initialState);
  const owners = createState<PlaybackInitiatedOwners>(initialOwners);
  const events = createEventStream<PresentationAction>();
  const [stateSignal, cleanupState] = stateToSignal(state);
  const [ownersSignal, cleanupOwners] = stateToSignal(owners);
  const cleanupEffect = trackPlaybackInitiated({ state: stateSignal, owners: ownersSignal, events });
  return {
    state,
    owners,
    events,
    cleanup: () => {
      cleanupEffect();
      cleanupState();
      cleanupOwners();
    },
  };
}

describe('trackPlaybackInitiated', () => {
  it('sets playbackInitiated to true when mediaElement fires play event', async () => {
    const mediaElement = document.createElement('video');
    const { state, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.current.playbackInitiated).toBe(true);
    cleanup();
  });

  it('dispatches play action to event stream', async () => {
    const mediaElement = document.createElement('video');
    const { events, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    const dispatched: PresentationAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toContainEqual({ type: 'play' });
    cleanup();
  });

  it('resets playbackInitiated to false when presentation URL changes', async () => {
    const mediaElement = document.createElement('video');
    const { state, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.current.playbackInitiated).toBe(true);

    state.patch({ presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(false);
    cleanup();
  });

  it('sets playbackInitiated back to true if play fires after a URL change (e.g. autoplay)', async () => {
    const mediaElement = document.createElement('video');
    const { state, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    state.patch({ presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.current.playbackInitiated).toBe(false);

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.current.playbackInitiated).toBe(true);

    cleanup();
  });

  it('resets playbackInitiated to false when the media element is swapped', async () => {
    const mediaElement = document.createElement('video');
    const { state, owners, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.current.playbackInitiated).toBe(true);

    owners.patch({ mediaElement: document.createElement('video') });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(false);
    cleanup();
  });

  it('does not reset playbackInitiated on unrelated state changes', async () => {
    const mediaElement = document.createElement('video');
    const { state, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.current.playbackInitiated).toBe(true);

    state.patch({ presentation: { url: 'http://example.com/stream.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(true);
    cleanup();
  });

  it('does not re-attach listener on unrelated owner changes', async () => {
    const mediaElement = document.createElement('video');
    const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

    const { owners, cleanup } = setupTrackPlaybackInitiated({}, { mediaElement });

    const callsBefore = addEventListenerSpy.mock.calls.length;
    owners.patch({ videoBuffer: {} } as PlaybackInitiatedOwners & { videoBuffer?: unknown });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    cleanup();
  });

  it('stops tracking after cleanup', async () => {
    const mediaElement = document.createElement('video');
    const { state, events, cleanup } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    const dispatched: PresentationAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    cleanup();

    mediaElement.dispatchEvent(new Event('play'));
    state.patch({ presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(dispatched).toHaveLength(0);
    expect(state.current.playbackInitiated).toBeFalsy();
  });
});
