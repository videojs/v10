import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import { type PlaybackRateContext, type PlaybackRateState, trackPlaybackRate } from '../track-playback-rate';

function makeState(initial: PlaybackRateState = {}): StateSignals<PlaybackRateState> {
  return { playbackRate: signal<number | undefined>(initial.playbackRate) };
}

function makeContext(initial: PlaybackRateContext = {}): ContextSignals<PlaybackRateContext> {
  return { mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement) };
}

function setupTrackPlaybackRate(initialState: PlaybackRateState = {}, initialContext: PlaybackRateContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const cleanup = trackPlaybackRate({ state, context });
  return { state, context, cleanup };
}

describe('trackPlaybackRate', () => {
  it('syncs playbackRate immediately when mediaElement is provided', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => {
      expect(state.playbackRate.get()).toBe(1);
    });

    cleanup();
  });

  it('updates playbackRate on ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));

    await vi.waitFor(() => {
      expect(state.playbackRate.get()).toBe(2);
    });

    cleanup();
  });

  it('continues tracking on subsequent ratechange events', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    mediaElement.playbackRate = 0.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(0.5));

    mediaElement.playbackRate = 1.5;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(1.5));

    cleanup();
  });

  it('does nothing when no mediaElement', async () => {
    const { state, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.playbackRate.get()).toBeUndefined();

    cleanup();
  });

  it('continues tracking correctly after context updates with unchanged mediaElement', async () => {
    const mediaElement = document.createElement('video');
    const ratechangeHandler = vi.fn();
    mediaElement.addEventListener('ratechange', ratechangeHandler);

    const { state, context, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(1));

    // Re-set mediaElement to the same instance — effect may re-run but no duplicate handling
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 30));

    // ratechange should still update state exactly once
    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));

    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(2));

    cleanup();
  });

  it('starts tracking when mediaElement is added later', async () => {
    const { state, context, cleanup } = setupTrackPlaybackRate();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.playbackRate.get()).toBeUndefined();

    const mediaElement = document.createElement('video');
    context.mediaElement.set(mediaElement);

    await vi.waitFor(() => {
      expect(state.playbackRate.get()).toBe(1);
    });

    cleanup();
  });

  it('stops listening to old mediaElement when replaced', async () => {
    const element1 = document.createElement('video');
    const element2 = document.createElement('video');

    const { state, context, cleanup } = setupTrackPlaybackRate({}, { mediaElement: element1 });

    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(1));

    context.mediaElement.set(element2);
    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(1));

    // Old element ratechange should no longer affect state
    element1.playbackRate = 3;
    element1.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.playbackRate.get()).toBe(1);

    cleanup();
  });

  it('removes ratechange listener on cleanup', async () => {
    const mediaElement = document.createElement('video');

    const { state, cleanup } = setupTrackPlaybackRate({}, { mediaElement });

    await vi.waitFor(() => expect(state.playbackRate.get()).toBe(1));

    cleanup();

    mediaElement.playbackRate = 2;
    mediaElement.dispatchEvent(new Event('ratechange'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.playbackRate.get()).toBe(1);
  });
});
