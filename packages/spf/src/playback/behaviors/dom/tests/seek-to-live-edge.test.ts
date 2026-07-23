import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type Presentation,
  type VideoTrack,
} from '../../../../media/types';
import { type SeekToLiveEdgeConfig, seekToLiveEdge } from '../seek-to-live-edge';

/**
 * 5-segment, 2s window starting at `startTime`: `[startTime, startTime + 10]`.
 * With the injected 6s live latency, the live-edge start is
 * `(startTime + 10) − 6 = startTime + 4` (104 for the default 100).
 */
function makePresentation(startTime = 100, mediaSequence = 50): Presentation {
  const video: VideoTrack = {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime,
    startDate: 1000,
    segments: [0, 2, 4, 6, 8].map((offset, i) => ({
      id: `segment-${mediaSequence + i}`,
      url: `${mediaSequence + i}.m4s`,
      duration: 2,
      startTime: startTime + offset,
    })),
    metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence, targetDuration: 2, endList: false } },
  };
  return {
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [{ id: 'video-set', type: 'video', switchingSets: [{ id: 'vs', type: 'video', tracks: [video] }] }],
  };
}

function fakeMediaSource(readyState: MediaSource['readyState'] = 'open') {
  return {
    readyState,
    duration: Number.NaN,
    setLiveSeekableRange: vi.fn(),
  } as unknown as MediaSource & { setLiveSeekableRange: ReturnType<typeof vi.fn> };
}

type FakeMediaElement = HTMLMediaElement & {
  currentTime: number;
  paused: boolean;
  seeking: boolean;
  readyState: HTMLMediaElement['readyState'];
};

/**
 * Event-capable fake: `seekToLiveEdge` attaches a `play` listener, so the
 * element must be a real `EventTarget`. Defaults to paused + `readyState`
 * HAVE_ENOUGH_DATA (the post-initial-seek resting state).
 */
function fakeMediaElement(
  init: Partial<Pick<FakeMediaElement, 'currentTime' | 'paused' | 'seeking' | 'readyState'>> = {}
): FakeMediaElement {
  return Object.assign(new EventTarget(), {
    currentTime: init.currentTime ?? 0,
    paused: init.paused ?? true,
    seeking: init.seeking ?? false,
    readyState: init.readyState ?? 4,
  }) as unknown as FakeMediaElement;
}

function run(opts: {
  presentation?: MaybeResolvedPresentation;
  trackId?: string;
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
  config?: SeekToLiveEdgeConfig;
  presentationAnchor?: number;
}) {
  // Built as vars (not inline literals) so the defensively-read
  // `selectedVideoTrackId` isn't rejected by the excess-property check against
  // the behavior's declared `{ presentation }` state slice. `presentationAnchor` defaults
  // to a defined value (the timeline is anchored) so the seek gate is open;
  // pass `presentationAnchor: undefined` to exercise the pre-anchor gate.
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(opts.presentation),
    selectedVideoTrackId: signal<string | undefined>(opts.trackId),
    presentationAnchor: signal<number | undefined>('presentationAnchor' in opts ? opts.presentationAnchor : 1000),
  };
  const context = {
    mediaElement: signal<HTMLMediaElement | undefined>(opts.mediaElement),
    mediaSource: signal<MediaSource | undefined>(opts.mediaSource),
  };
  // The engine injects this seam; here a fixed 6s latency (HLS 3 × targetDuration(2))
  // stands in so the live-edge start lands at windowEnd − 6.
  const config = { resolveLiveLatency: () => 6, ...opts.config };
  // The manual `Behavior<>` literal widens the setup return to `BehaviorCleanup`;
  // narrow back to the reactor's destroy handle for teardown.
  const reactor = seekToLiveEdge.setup({ state, context, config }) as { destroy: () => void };
  return { cleanup: () => reactor.destroy(), state, context };
}

// Let the effect re-run after a signal write (effects re-run on a microtask).
const flush = () => Promise.resolve();

describe('seekToLiveEdge', () => {
  it('seeks near the live edge on entry (target live latency behind)', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup } = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    // Start the live latency (6s) behind the edge: 110 − 6 = 104, not the window start.
    expect(el.currentTime).toBe(104);

    cleanup();
  });

  it('does not seek until the MediaSource is published (open)', () => {
    const el = fakeMediaElement();

    // `setupMediaSource` publishes `context.mediaSource` only once open, so an
    // unpublished (absent) MediaSource is the "not ready" gate.
    const { cleanup } = run({
      presentation: makePresentation(),
      trackId: 'v-1',
      mediaElement: el,
      mediaSource: undefined,
    });

    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('does not seek until the timeline is anchored (presentationAnchor published)', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    // Pre-anchor: anchorPresentationTimeline hasn't buffer-pinned yet, so the window is the
    // raw (pre-shift) one. Seeking now would strand the playhead when the pin
    // later shifts the window; the gate holds the seek until `presentationAnchor` lands.
    const { cleanup } = run({
      presentation: makePresentation(),
      trackId: 'v-1',
      mediaElement: el,
      mediaSource: ms,
      presentationAnchor: undefined,
    });

    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('no-ops for a complete (finite-duration) playlist — VoD / ended live', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const presentation = makePresentation();
    // Complete playlist → parser sets a finite Track.duration.
    const video = presentation.selectionSets[0]!.switchingSets[0]!.tracks[0] as VideoTrack;
    video.duration = 110;

    const { cleanup } = run({ presentation, trackId: 'v-1', mediaElement: el, mediaSource: ms });

    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('no-ops without a resolved presentation or selected track', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup } = run({ presentation: undefined, trackId: undefined, mediaElement: el, mediaSource: ms });

    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('seeks once per source — a transient re-entry into live does not re-fire the edge seek', async () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup, state } = run({
      presentation: makePresentation(),
      trackId: 'v-1',
      mediaElement: el,
      mediaSource: ms,
    });
    expect(el.currentTime).toBe(104); // initial edge seek

    // Viewer scrubs back into the DVR window (still inside it, above the start).
    el.currentTime = 100;

    // A transient precondition flip (here the anchor blinks, standing in for the
    // live edge briefly going unknown mid track-switch) takes the reactor
    // inactive → live for the SAME source.
    state.presentationAnchor.set(undefined);
    await flush();
    state.presentationAnchor.set(1000);
    await flush();

    // Not yanked back to the edge — the seek is once per source.
    expect(el.currentTime).toBe(100);

    cleanup();
  });

  it('re-seeks on a genuine source change (new url)', async () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup, state } = run({
      presentation: makePresentation(),
      trackId: 'v-1',
      mediaElement: el,
      mediaSource: ms,
    });
    expect(el.currentTime).toBe(104);
    el.currentTime = 100; // viewer moved

    // Source change goes through an unresolved presentation (exits live), then a
    // new resolved source with a different url.
    state.presentation.set(undefined);
    await flush();
    const next = makePresentation(200, 80);
    next.url = 'https://example.com/other.m3u8';
    state.presentation.set(next);
    await flush();

    // New source → re-seeks to its live edge (window [200,210], 6s latency → 204).
    expect(el.currentTime).toBe(204);

    cleanup();
  });

  describe('live-window playhead guard', () => {
    function started() {
      const ms = fakeMediaSource();
      const el = fakeMediaElement();
      const { cleanup, state } = run({
        presentation: makePresentation(),
        trackId: 'v-1',
        mediaElement: el,
        mediaSource: ms,
      });
      // Initial entry seeked into the window at the live edge (104). Window [100, 110].
      expect(el.currentTime).toBe(104);
      return { el, ms, state, cleanup };
    }

    it('leaves the playhead alone when playing inside the window (resume)', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 106; // within [100, 110]
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(106);
      cleanup();
    });

    it('repositions to the live edge on resume when the playhead is behind the window start', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 90; // fell behind windowStart (100)
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(104);
      cleanup();
    });

    it('does not reposition while paused as the window slides; repositions on resume', async () => {
      const { el, state, cleanup } = started();
      el.currentTime = 90; // window slid past while paused
      el.paused = true;

      // A window-update re-fire (playlist reload) while paused must not yank.
      state.presentation.set(makePresentation());
      await flush();
      expect(el.currentTime).toBe(90); // paused → untouched

      el.paused = false;
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(104); // resume snaps into the window
      cleanup();
    });

    it('does not yank an in-window DVR scrub-back across a window update', async () => {
      const { el, state, cleanup } = started();
      el.paused = false;
      el.currentTime = 102; // user scrubbed back, still within [100, 110]

      state.presentation.set(makePresentation()); // window unchanged → still in window
      await flush();
      expect(el.currentTime).toBe(102);
      cleanup();
    });

    it('does not yank an in-flight seek to an in-window position (DVR scrub-back)', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 102; // scrubbing back to a valid position within [100, 110]
      el.seeking = true;
      el.dispatchEvent(new Event('play'));
      // In-window → never trips the `< windowStart` guard, so the seek proceeds
      // untouched. The guard discriminates on position, not the `seeking` flag.
      expect(el.currentTime).toBe(102);
      cleanup();
    });

    it('rescues a seek stranded behind the window start, even while still seeking', async () => {
      const { el, state, cleanup } = started();
      el.paused = false;
      // A scrub toward the back of the window lands on data that has since slid
      // out and been evicted: the seek hangs (readyState drops, `seeking` stays
      // true) and `currentTime` is frozen behind the window start.
      el.seeking = true;
      el.readyState = 1; // HAVE_METADATA — stalled, no data at the target
      el.currentTime = 90;

      // The window-update re-fire (a playlist reload — `timeupdate` is silent
      // during the stall) catches it: 90 < new windowStart 200. Previously the
      // `seeking` bail blocked this and the playhead stranded permanently.
      state.presentation.set(makePresentation(200, 100));
      await flush();

      expect(el.currentTime).toBe(204); // snapped to the new live edge despite `seeking`
      cleanup();
    });

    it('tolerates a sub-threshold boundary excursion without a jitter seek', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 99.95; // within REPOSITION_TOLERANCE (0.1) of windowStart 100
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(99.95); // no jitter seek

      el.currentTime = 99.85; // beyond tolerance (< 100 − 0.1)
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(104);
      cleanup();
    });

    it('does not reposition while paused as the window slides across reloads; snaps in on resume', async () => {
      const { el, state, cleanup } = started();
      el.paused = true;

      // Window slides forward past the frozen paused playhead over several reloads.
      state.presentation.set(makePresentation(200, 100));
      await flush();
      state.presentation.set(makePresentation(300, 150));
      await flush();
      expect(el.currentTime).toBe(104); // still untouched while paused

      el.paused = false;
      el.dispatchEvent(new Event('play'));
      // New window [300, 310] → live edge 310 − 6 = 304.
      expect(el.currentTime).toBe(304);
      cleanup();
    });

    it('repositions on the window-update re-fire when playback has stalled behind the window', async () => {
      const { el, state, cleanup } = started();
      el.paused = false; // a stall is not a pause; currentTime is frozen at 104
      el.readyState = 2; // HAVE_CURRENT_DATA — buffer drained

      // The window slides forward via reloads while currentTime stays frozen.
      state.presentation.set(makePresentation(200, 100));
      await flush();

      // The window-update re-fire (not a media event — `timeupdate` is silent
      // during a stall) catches it: 104 < new windowStart 200 → snap to 204.
      expect(el.currentTime).toBe(204);
      cleanup();
    });
  });
});
