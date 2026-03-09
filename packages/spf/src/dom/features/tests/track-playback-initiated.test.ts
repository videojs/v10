import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../../core/events/create-event-stream';
import type { PresentationAction } from '../../../core/features/resolve-presentation';
import { createState } from '../../../core/state/create-state';
import {
  type PlaybackInitiatedOwners,
  type PlaybackInitiatedState,
  trackPlaybackInitiated,
} from '../track-playback-initiated';

describe('trackPlaybackInitiated', () => {
  it('sets playbackInitiated to true when mediaElement fires play event', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({});
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.current.playbackInitiated).toBe(true);
    cleanup();
  });

  it('dispatches play action to event stream', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({});
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const dispatched: PresentationAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toContainEqual({ type: 'play' });
    cleanup();
  });

  it('resets playbackInitiated to false when presentation URL changes', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({
      presentation: { url: 'http://example.com/stream1.m3u8' },
      playbackInitiated: true,
    });
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    state.patch({ presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(false);
    cleanup();
  });

  it('does not reset playbackInitiated on unrelated state changes', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({
      presentation: { url: 'http://example.com/stream.m3u8' },
      playbackInitiated: true,
    });
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    state.patch({ playbackInitiated: true });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(true);
    cleanup();
  });

  it('does not reset playbackInitiated on initial URL set', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({});
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    state.patch({ presentation: { url: 'http://example.com/stream.m3u8' } });
    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.current.playbackInitiated).toBe(true);
    cleanup();
  });

  it('does nothing when no mediaElement', async () => {
    const state = createState<PlaybackInitiatedState>({});
    const owners = createState<PlaybackInitiatedOwners>({});
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.current.playbackInitiated).toBeUndefined();
    cleanup();
  });

  it('does not re-attach listener on unrelated owner changes', async () => {
    const mediaElement = document.createElement('video');
    const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

    const state = createState<PlaybackInitiatedState>({});
    const owners = createState<PlaybackInitiatedOwners & { videoBuffer?: unknown }>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const cleanup = trackPlaybackInitiated({ state, owners, events });

    const callsBefore = addEventListenerSpy.mock.calls.length;
    owners.patch({ videoBuffer: {} });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    cleanup();
  });

  it('stops tracking after cleanup', async () => {
    const mediaElement = document.createElement('video');
    const state = createState<PlaybackInitiatedState>({
      presentation: { url: 'http://example.com/stream1.m3u8' },
    });
    const owners = createState<PlaybackInitiatedOwners>({ mediaElement });
    const events = createEventStream<PresentationAction>();

    const dispatched: PresentationAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = trackPlaybackInitiated({ state, owners, events });
    cleanup();

    mediaElement.dispatchEvent(new Event('play'));
    state.patch({ presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(dispatched).toHaveLength(0);
    expect(state.current.playbackInitiated).toBeUndefined();
  });
});
