import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { setupAirPlay } from '../airplay';

/** Matches REMOTE_INACTIVE_SETTLE_MS in airplay.ts (falling-edge debounce). */
const SETTLE_MS = 1000;

// jsdom/Chromium lack WebKit's AirPlay APIs; stub the global support flag that
// `isWebKitAirPlayCapable` probes for. See `utils/dom/tests/webkit.test.ts`.
const AIRPLAY_KEY = 'WebKitPlaybackTargetAvailabilityEvent';
function stubWebKit(present: boolean): void {
  if (present) {
    (globalThis as unknown as Record<string, unknown>)[AIRPLAY_KEY] = class {};
  } else {
    delete (globalThis as unknown as Record<string, unknown>)[AIRPLAY_KEY];
  }
}

interface WebKitVideoLike extends HTMLVideoElement {
  webkitCurrentPlaybackTargetIsWireless: boolean;
}

/**
 * A real `<video>` decorated with the WebKit AirPlay flag so
 * `isWebKitAirPlayCapable` recognizes it (`'…IsWireless' in media`).
 */
function makeWebKitVideo(opts: { wireless?: boolean; disableRemotePlayback?: boolean } = {}): WebKitVideoLike {
  const video = document.createElement('video') as WebKitVideoLike;
  video.webkitCurrentPlaybackTargetIsWireless = opts.wireless ?? false;
  video.disableRemotePlayback = opts.disableRemotePlayback ?? false;
  return video;
}

const WIRELESS_EVENT = 'webkitcurrentplaybacktargetiswirelesschanged';

function setWireless(video: WebKitVideoLike, wireless: boolean): void {
  video.webkitCurrentPlaybackTargetIsWireless = wireless;
  video.dispatchEvent(new Event(WIRELESS_EVENT));
}

/** Minimal Remote Playback API double (jsdom has no `video.remote`). */
class FakeRemotePlayback extends EventTarget {
  state: RemotePlaybackState = 'disconnected';
  setState(next: RemotePlaybackState, eventType: 'connecting' | 'connect' | 'disconnect'): void {
    this.state = next;
    this.dispatchEvent(new Event(eventType));
  }
}

function attachFakeRemote(video: WebKitVideoLike): FakeRemotePlayback {
  const remote = new FakeRemotePlayback();
  Object.defineProperty(video, 'remote', { value: remote, configurable: true });
  return remote;
}

function makeSignals(presentation?: MaybeResolvedPresentation) {
  return {
    state: {
      presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
      disableRemotePlayback: signal<boolean | undefined>(undefined),
      loadingSuspended: signal<boolean | undefined>(undefined),
      startPosition: signal<number | undefined>(undefined),
      resumePlayback: signal<boolean | undefined>(undefined),
    },
    context: {
      mediaElement: signal<HTMLMediaElement | undefined>(undefined),
      mediaSource: signal<MediaSource | undefined>(undefined),
    },
  };
}

/** Stand-in for a published, open MediaSource (only identity matters here). */
const fakeMediaSource = {} as MediaSource;

/** Drain microtasks (reactor transition + entry effects) plus any nested effects. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fallbackSourceOf(video: HTMLMediaElement): HTMLSourceElement | null {
  return video.querySelector('source[type="application/x-mpegURL"]');
}

describe('setupAirPlay', () => {
  afterEach(() => {
    stubWebKit(false);
    vi.useRealTimers();
  });

  it('is a no-op on non-WebKit platforms', async () => {
    stubWebKit(false);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();

    // A wireless event must not touch engine state on an unsupported platform.
    setWireless(video, true);
    await flush();
    expect(state.loadingSuspended.get()).toBeUndefined();

    reactor.destroy();
  });

  it('appends the fallback HLS source once the MediaSource is open', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    await flush();

    // No MediaSource yet → no fallback source (it must not exist without an
    // MSE to sit behind, or `load()` would select it for local native HLS).
    expect(fallbackSourceOf(video)).toBeNull();

    context.mediaSource.set(fakeMediaSource);
    await flush();

    const source = fallbackSourceOf(video);
    expect(source).not.toBeNull();
    expect(source?.src).toBe('https://example.com/a.m3u8');

    reactor.destroy();
  });

  it('keeps the fallback source through a live session when the MediaSource detaches', async () => {
    vi.useFakeTimers();
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await vi.advanceTimersByTimeAsync(0);
    expect(fallbackSourceOf(video)).not.toBeNull();

    // Session engages, then Safari closes the MMS and the engine detaches it
    // (liveness recovery) — the receiver is playing exactly this fallback
    // source, so it must survive the mediaSource slot clearing.
    setWireless(video, true);
    await vi.advanceTimersByTimeAsync(0);
    context.mediaSource.set(undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(fallbackSourceOf(video)).not.toBeNull();

    // Session's settled falling edge with no MediaSource republished yet —
    // the rebuild's fresh open re-adopts the source; until then it may drop.
    setWireless(video, false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    context.mediaSource.set({} as MediaSource);
    await vi.advanceTimersByTimeAsync(0);
    expect(fallbackSourceOf(video)).not.toBeNull();

    reactor.destroy();
  });

  it('removes the fallback source when the MediaSource detaches, re-appends on the next open', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    // A src change tears down the MSE (setupMediaSource clears the slot). The
    // fallback must go with it — a leftover would be the sole source when
    // detach's `load()` runs, starting local native HLS.
    context.mediaSource.set(undefined);
    await flush();
    expect(fallbackSourceOf(video)).toBeNull();

    // The next source opens → fallback re-appears, now carrying the new URL.
    state.presentation.set({ url: 'https://example.com/b.m3u8' });
    context.mediaSource.set({} as MediaSource);
    await flush();
    expect(fallbackSourceOf(video)?.src).toBe('https://example.com/b.m3u8');

    reactor.destroy();
  });

  it('enables the AirPlay picker only once the MediaSource is open (sourceopen)', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    // Author didn't opt out.
    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    await flush();

    // Simulate setupMediaSource's MMS path disabling remote playback so the
    // ManagedMediaSource can fire `sourceopen`. AirPlay must NOT flip it back
    // yet — doing so before open would prevent the source from opening.
    video.disableRemotePlayback = true;
    await flush();
    expect(video.disableRemotePlayback).toBe(true);

    // MediaSource opens → setupMediaSource publishes it → picker enabled.
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(video.disableRemotePlayback).toBe(false);

    reactor.destroy();
  });

  it('keeps the fallback source URL in sync with the presentation', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(fallbackSourceOf(video)?.src).toBe('https://example.com/a.m3u8');

    // A presentation update (same MediaSource) must refresh the fallback so a
    // later AirPlay engage casts the current stream, not the attach-time one.
    state.presentation.set({ url: 'https://example.com/b.m3u8' });
    await flush();
    expect(fallbackSourceOf(video)?.src).toBe('https://example.com/b.m3u8');

    // Cleared presentation empties the fallback src.
    state.presentation.set(undefined);
    await flush();
    expect(fallbackSourceOf(video)?.getAttribute('src')).toBe('');

    reactor.destroy();
  });

  it('honors an author opt-out (disableRemotePlayback=true) — sets nothing up', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    // Author's explicit opt-out, expressed through the adapter signal (not the
    // DOM property). The `<video>` starts with the flag MMS would leave set.
    const video = makeWebKitVideo({ disableRemotePlayback: true });
    state.disableRemotePlayback.set(true);
    context.mediaElement.set(video);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();

    // Even once the MediaSource opens, the picker stays disabled — the author
    // opted out, so the enable-picker effect was never wired.
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(video.disableRemotePlayback).toBe(true);

    reactor.destroy();
  });

  it('tears down when the author opts out after attach', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    // Set up: fallback source present, picker enabled.
    expect(fallbackSourceOf(video)).not.toBeNull();
    expect(video.disableRemotePlayback).toBe(false);

    // Framework binds the opt-out after attach() — the machine must react.
    state.disableRemotePlayback.set(true);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
    // Picker enablement is undone, not merely left in place.
    expect(video.disableRemotePlayback).toBe(true);

    reactor.destroy();
  });

  it('runs setup when an initial opt-out is cleared after attach', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    // Author opted out at attach → nothing is set up.
    const video = makeWebKitVideo({ disableRemotePlayback: true });
    state.disableRemotePlayback.set(true);
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(fallbackSourceOf(video)).toBeNull();

    // Clearing the opt-out after attach must run setup (MediaSource is open).
    state.disableRemotePlayback.set(false);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    reactor.destroy();
  });

  it('mirrors the wireless target onto loadingSuspended (falling edge settles)', async () => {
    vi.useFakeTimers();
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: false });
    context.mediaElement.set(video);
    await vi.advanceTimersByTimeAsync(0);
    // Sync at attach: not wireless → session not active.
    expect(state.loadingSuspended.get()).toBe(false);

    setWireless(video, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    // The falling edge is debounced (Safari transiently reports inactive
    // mid-handoff) — the suspension holds until the inactive reading settles.
    setWireless(video, false);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(state.loadingSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('snapshots the element playback state at the settled session end', async () => {
    vi.useFakeTimers();
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    Object.defineProperty(video, 'currentTime', { value: 87, writable: true, configurable: true });
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    context.mediaElement.set(video);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    // No commands mid-session: the element (mirroring the receiver) is the
    // source of truth until the session ends.
    expect(state.startPosition.get()).toBeUndefined();
    expect(state.resumePlayback.get()).toBeUndefined();

    // Settled session end: the element still carries the receiver-mirrored
    // state, and the rebuild only proceeds once the suspension release lets
    // it — so the one-shot commands are written first, from a pre-`load()`
    // element.
    setWireless(video, false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(state.startPosition.get()).toBe(87);
    expect(state.resumePlayback.get()).toBe(true);
    expect(state.loadingSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('holds loadingSuspended through a transient inactive flap', async () => {
    vi.useFakeTimers();
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    // Safari 26.4's engage sequence: right after `sourceclose`, the wireless
    // flag transiently reads false and the changed event fires, then flips
    // back as the receiver pipeline settles. The suspension must not drop —
    // a drop releases setupMediaSource's rebuild hold and kills the session.
    setWireless(video, false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS / 2);
    expect(state.loadingSuspended.get()).toBe(true);

    setWireless(video, true);
    await vi.advanceTimersByTimeAsync(SETTLE_MS * 2);
    expect(state.loadingSuspended.get()).toBe(true);

    reactor.destroy();
  });

  it('treats a Remote Playback API session (connecting/connected) as active', async () => {
    vi.useFakeTimers();
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: false });
    const remote = attachFakeRemote(video);
    context.mediaElement.set(video);
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(false);

    // `remote.state = 'connecting'` leads the engage — it fires when the user
    // picks a receiver, before WebKit's wireless flag flips or the MMS closes.
    remote.setState('connecting', 'connecting');
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    remote.setState('connected', 'connect');
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);

    // While `remote.state` reads active, a wireless=false event alone must
    // not even start the falling edge.
    setWireless(video, false);
    await vi.advanceTimersByTimeAsync(SETTLE_MS * 2);
    expect(state.loadingSuspended.get()).toBe(true);

    // True disengage: both signals inactive → clears after the settle window.
    remote.setState('disconnected', 'disconnect');
    await vi.advanceTimersByTimeAsync(0);
    expect(state.loadingSuspended.get()).toBe(true);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(state.loadingSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('reflects an AirPlay session already active at attach', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    await flush();

    expect(state.loadingSuspended.get()).toBe(true);

    reactor.destroy();
  });

  it('releases loadingSuspended when torn down mid-session', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(state.loadingSuspended.get()).toBe(true);

    // Detach mid-session must not strand setupMediaSource holding a dead MS
    // or the loaders suspended — and it is not a session end, so no restore
    // commands are written.
    context.mediaElement.set(undefined);
    await flush();
    expect(state.loadingSuspended.get()).toBe(false);
    expect(state.startPosition.get()).toBeUndefined();
    expect(state.resumePlayback.get()).toBeUndefined();

    // The listener is gone — a stray wireless event does nothing.
    setWireless(video, true);
    await flush();
    expect(state.loadingSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('cleans up on detach: removes the source, restores the MMS default', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    context.mediaElement.set(undefined);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
    // Cleanup hands the element back to its MMS-default remote-playback state.
    expect(video.disableRemotePlayback).toBe(true);

    reactor.destroy();
  });

  it('cleans up on destroy', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    reactor.destroy();
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
  });
});
