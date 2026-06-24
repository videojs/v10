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
}) {
  // Built as vars (not inline literals) so the defensively-read
  // `selectedVideoTrackId` isn't rejected by the excess-property check against
  // the behavior's declared `{ presentation }` state slice.
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(opts.presentation),
    selectedVideoTrackId: signal<string | undefined>(opts.trackId),
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

    it('does not reposition while a seek is in progress; repositions once it settles', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 90;
      el.seeking = true;
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(90); // seek in flight → untouched

      el.seeking = false;
      el.dispatchEvent(new Event('play'));
      expect(el.currentTime).toBe(104);
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
