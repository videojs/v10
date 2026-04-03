import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
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

describe('trackPlaybackInitiated', () => {
  it('sets playbackInitiated to true when mediaElement fires play event', async () => {
    const mediaElement = document.createElement('video');
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(state.get().playbackInitiated).toBe(true);
    reactor.destroy();
  });

  it('resets playbackInitiated to false when presentation URL changes', async () => {
    const mediaElement = document.createElement('video');
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    state.set({ ...state.get(), presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('sets playbackInitiated back to true if play fires after a URL change', async () => {
    const mediaElement = document.createElement('video');
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    state.set({ ...state.get(), presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(false);

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    reactor.destroy();
  });

  it('resets playbackInitiated to false when the media element is swapped', async () => {
    const mediaElement = document.createElement('video');
    const { state, owners, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    owners.set({ ...owners.get(), mediaElement: document.createElement('video') });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(false);
    reactor.destroy();
  });

  it('does not reset playbackInitiated on unrelated state changes', async () => {
    const mediaElement = document.createElement('video');
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state.get().playbackInitiated).toBe(true);

    state.set({ ...state.get(), presentation: { url: 'http://example.com/stream.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBe(true);
    reactor.destroy();
  });

  it('does not re-attach listener on unrelated owner changes', async () => {
    const mediaElement = document.createElement('video');
    const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

    const { owners, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement }
    );

    const callsBefore = addEventListenerSpy.mock.calls.length;
    owners.set({ ...owners.get(), videoBuffer: {} } as PlaybackInitiatedOwners & { videoBuffer?: unknown });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    reactor.destroy();
  });

  it('stops tracking after destroy', async () => {
    const mediaElement = document.createElement('video');
    const { state, reactor } = setupTrackPlaybackInitiated(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement }
    );

    reactor.destroy();

    mediaElement.dispatchEvent(new Event('play'));
    state.set({ ...state.get(), presentation: { url: 'http://example.com/stream2.m3u8' } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(state.get().playbackInitiated).toBeFalsy();
  });
});
