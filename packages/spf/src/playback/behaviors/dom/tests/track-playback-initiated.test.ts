import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import {
  type PlaybackInitiatedContext,
  type PlaybackInitiatedState,
  trackPlaybackInitiated,
} from '../track-playback-initiated';

function makeState(initial: PlaybackInitiatedState = {}): StateSignals<PlaybackInitiatedState> {
  return {
    playbackInitiated: signal<boolean | undefined>(initial.playbackInitiated),
    presentation: signal<PlaybackInitiatedState['presentation']>(initial.presentation),
  };
}

function makeContext(initial: PlaybackInitiatedContext = {}): ContextSignals<PlaybackInitiatedContext> {
  return { mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement) };
}

function setupTrackPlaybackInitiated(
  initialState: PlaybackInitiatedState = {},
  initialContext: PlaybackInitiatedContext = {}
) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const reactor = trackPlaybackInitiated({ state, context });
  return { state, context, reactor };
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
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.playbackInitiated.get()).toBe(true);
    reactor.destroy();
  });

  it('sets playbackInitiated to true immediately if element is already playing', async () => {
    const { el } = makeMediaElement(false);
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.playbackInitiated.get()).toBe(true);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when presentation URL changes', async () => {
    const { el, play, pause } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.playbackInitiated.get()).toBe(true);

    // Simulate source change: element pauses as new media loads.
    pause();
    state.presentation.set({ url: 'http://example.com/stream2.m3u8' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when the media element is swapped', async () => {
    const { el, play } = makeMediaElement();
    const { state, context, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.playbackInitiated.get()).toBe(true);

    // New element starts paused.
    context.mediaElement.set(document.createElement('video'));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when element is removed', async () => {
    const { el, play } = makeMediaElement();
    const { state, context, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.playbackInitiated.get()).toBe(true);

    context.mediaElement.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBe(false);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when URL is cleared', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.playbackInitiated.get()).toBe(true);

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBe(false);
    reactor.destroy();
  });

  it('does not reset playbackInitiated on unrelated state changes', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.playbackInitiated.get()).toBe(true);

    state.presentation.set({ url: 'http://example.com/stream.m3u8' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBe(true);
    reactor.destroy();
  });

  it('does not re-attach listener on unrelated context changes', async () => {
    const { el } = makeMediaElement();
    const addEventListenerSpy = vi.spyOn(el, 'addEventListener');

    const state = makeState({ presentation: { url: 'http://example.com/stream.m3u8' } });
    const context: ContextSignals<PlaybackInitiatedContext> & { videoBuffer: ReturnType<typeof signal<unknown>> } = {
      mediaElement: signal<HTMLMediaElement | undefined>(el),
      videoBuffer: signal<unknown>(undefined),
    };
    const reactor = trackPlaybackInitiated({ state, context });

    await new Promise((resolve) => setTimeout(resolve, 10));
    const callsBefore = addEventListenerSpy.mock.calls.length;

    context.videoBuffer.set({});
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    reactor.destroy();
  });

  it('stops tracking after destroy', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement: el }
    );

    reactor.destroy();

    play();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.playbackInitiated.get()).toBeFalsy();
  });
});
