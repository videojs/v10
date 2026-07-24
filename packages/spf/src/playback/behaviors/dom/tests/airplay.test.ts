import { afterEach, describe, expect, it } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { setupAirPlay } from '../airplay';

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

const WIRELESS_EVENT = 'webkitcurrentplaybacktargetiswirelesschanged';

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

function setWireless(video: WebKitVideoLike, wireless: boolean): void {
  video.webkitCurrentPlaybackTargetIsWireless = wireless;
  video.dispatchEvent(new Event(WIRELESS_EVENT));
}

function makeSignals(presentation?: MaybeResolvedPresentation) {
  return {
    state: {
      presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
      loadSuspended: signal<boolean | undefined>(undefined),
      disableRemotePlayback: signal<boolean | undefined>(undefined),
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
  afterEach(() => stubWebKit(false));

  it('is a no-op on non-WebKit platforms', async () => {
    stubWebKit(false);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();

    // A wireless event must not touch load state on an unsupported platform.
    setWireless(video, true);
    await flush();
    expect(state.loadSuspended.get()).toBeUndefined();

    reactor.destroy();
  });

  it('appends the fallback HLS source on attach', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    await flush();

    const source = fallbackSourceOf(video);
    expect(source).not.toBeNull();
    expect(source?.src).toBe('https://example.com/a.m3u8');

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
    await flush();
    expect(fallbackSourceOf(video)?.src).toBe('https://example.com/a.m3u8');

    // A source change must update the fallback so a later AirPlay engage casts
    // the current stream, not the attach-time one.
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
    const video = makeWebKitVideo({ disableRemotePlayback: true, wireless: true });
    state.disableRemotePlayback.set(true);
    context.mediaElement.set(video);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
    // No wireless listener wired → no suspend even though the target is wireless.
    expect(state.loadSuspended.get()).toBeUndefined();

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

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    context.mediaSource.set(fakeMediaSource);
    await flush();
    // Set up: fallback source present, picker enabled, suspended (wireless).
    expect(fallbackSourceOf(video)).not.toBeNull();
    expect(video.disableRemotePlayback).toBe(false);
    expect(state.loadSuspended.get()).toBe(true);

    // Framework binds the opt-out after attach() — the machine must react.
    state.disableRemotePlayback.set(true);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
    // Picker enablement is undone, not merely left in place.
    expect(video.disableRemotePlayback).toBe(true);
    expect(state.loadSuspended.get()).toBe(false);

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
    await flush();
    expect(fallbackSourceOf(video)).toBeNull();

    // Clearing the opt-out after attach must run setup.
    state.disableRemotePlayback.set(false);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    reactor.destroy();
  });

  // Note: This just tests loadSuspended but the way Safari handles MMS, SPF wont load once we turn wireless off.
  it('suspends loading while the wireless target is active and resumes when it turns off', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: false });
    context.mediaElement.set(video);
    await flush();
    // Sync at attach: not wireless → not suspended.
    expect(state.loadSuspended.get()).toBe(false);

    setWireless(video, true);
    await flush();
    expect(state.loadSuspended.get()).toBe(true);

    setWireless(video, false);
    await flush();
    expect(state.loadSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('suspends immediately when AirPlay is already active at attach', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    await flush();

    expect(state.loadSuspended.get()).toBe(true);

    reactor.destroy();
  });

  it('cleans up on detach: removes the source, drops the listener, releases suspend', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo({ wireless: true });
    context.mediaElement.set(video);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();
    expect(state.loadSuspended.get()).toBe(true);

    context.mediaElement.set(undefined);
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
    // Cleanup hands the element back to its MMS-default remote-playback state.
    expect(video.disableRemotePlayback).toBe(true);
    // Detaching mid-wireless must not strand loading suspended.
    expect(state.loadSuspended.get()).toBe(false);

    // The listener is gone — a stray wireless event does nothing.
    setWireless(video, true);
    await flush();
    expect(state.loadSuspended.get()).toBe(false);

    reactor.destroy();
  });

  it('cleans up on destroy', async () => {
    stubWebKit(true);
    const { state, context } = makeSignals({ url: 'https://example.com/a.m3u8' });
    const reactor = setupAirPlay.setup({ state, context });

    const video = makeWebKitVideo();
    context.mediaElement.set(video);
    await flush();
    expect(fallbackSourceOf(video)).not.toBeNull();

    reactor.destroy();
    await flush();

    expect(fallbackSourceOf(video)).toBeNull();
  });
});
