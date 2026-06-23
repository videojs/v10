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
 * HOLD-BACK = 3 × targetDuration(2) = 6, so the live-edge start is
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
 * Event-capable fake: `seekToLiveEdge` attaches `playing` / `timeupdate` /
 * `seeked` listeners, so the element must be a real `EventTarget`. Defaults to
 * paused + `readyState` HAVE_ENOUGH_DATA (the post-initial-seek resting state).
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
  const cleanup = seekToLiveEdge.setup({ state, context, config: opts.config ?? {} }) as () => void;
  return { cleanup, state, context };
}

// Let the effect re-run after a signal write (effects re-run on a microtask).
const flush = () => Promise.resolve();

describe('seekToLiveEdge', () => {
  it('declares the full seekable window and seeks near the live edge (HOLD-BACK behind)', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup } = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    // Full DVR window stays seekable: [first.startTime, last.startTime + last.duration] = [100, 110].
    expect(ms.setLiveSeekableRange).toHaveBeenCalledWith(100, 110);
    expect(ms.duration).toBe(Number.POSITIVE_INFINITY);
    // Start HOLD-BACK (3 × 2s) behind the edge: 110 − 6 = 104, not the window start.
    expect(el.currentTime).toBe(104);

    cleanup();
  });

  it('does nothing until the MediaSource is open', () => {
    const ms = fakeMediaSource('closed');
    const el = fakeMediaElement();

    const { cleanup } = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();
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

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();
    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('no-ops without a resolved presentation or selected track', () => {
    const ms = fakeMediaSource();
    const el = fakeMediaElement();

    const { cleanup } = run({ presentation: undefined, trackId: undefined, mediaElement: el, mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();
    expect(el.currentTime).toBe(0);

    cleanup();
  });

  describe('live-window playhead guard', () => {
    function started(config?: SeekToLiveEdgeConfig) {
      const ms = fakeMediaSource();
      const el = fakeMediaElement();
      const { cleanup, state } = run({
        presentation: makePresentation(),
        trackId: 'v-1',
        mediaElement: el,
        mediaSource: ms,
        config,
      });
      // Initial entry seeked into the window at the live edge (104). Window [100, 110].
      expect(el.currentTime).toBe(104);
      return { el, ms, state, cleanup };
    }

    it('leaves the playhead alone when playing inside the window', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 106; // within [100, 110]
      el.dispatchEvent(new Event('timeupdate'));
      expect(el.currentTime).toBe(106);
      cleanup();
    });

    it('repositions to the live edge when the playhead falls behind the window start (playing)', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 90; // fell behind windowStart (100)
      el.dispatchEvent(new Event('playing'));
      expect(el.currentTime).toBe(104);
      cleanup();
    });

    it('repositions to the live edge when the playhead overruns the window end (playing)', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 120; // past windowEnd (110)
      el.dispatchEvent(new Event('timeupdate'));
      expect(el.currentTime).toBe(104);
      cleanup();
    });

    it('does not reposition while paused; repositions on resume', () => {
      const { el, cleanup } = started();
      el.currentTime = 90; // window slid past while paused
      el.paused = true;
      el.dispatchEvent(new Event('timeupdate'));
      expect(el.currentTime).toBe(90); // paused → untouched

      el.paused = false;
      el.dispatchEvent(new Event('playing'));
      expect(el.currentTime).toBe(104); // resume snaps into the window
      cleanup();
    });

    it('does not yank an in-window DVR scrub-back (playing)', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 102; // user scrubbed back, still within [100, 110]
      el.dispatchEvent(new Event('seeked'));
      expect(el.currentTime).toBe(102);
      cleanup();
    });

    it('does not reposition while a seek is in progress; repositions once it settles', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 90;
      el.seeking = true;
      el.dispatchEvent(new Event('timeupdate'));
      expect(el.currentTime).toBe(90); // seek in flight → untouched

      el.seeking = false;
      el.dispatchEvent(new Event('seeked'));
      expect(el.currentTime).toBe(104);
      cleanup();
    });

    it('tolerates a sub-threshold boundary excursion without a jitter seek', () => {
      const { el, cleanup } = started();
      el.paused = false;
      el.currentTime = 99.95; // within REPOSITION_TOLERANCE (0.1) of windowStart 100
      el.dispatchEvent(new Event('timeupdate'));
      expect(el.currentTime).toBe(99.95); // no jitter seek

      el.currentTime = 99.85; // beyond tolerance (< 100 − 0.1)
      el.dispatchEvent(new Event('timeupdate'));
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
      el.dispatchEvent(new Event('playing'));
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

      // The effect's window-update re-fire (not timeupdate, which is silent during
      // a stall) catches it: 104 < new windowStart 200 → snap to new live edge 204.
      expect(el.currentTime).toBe(204);
      cleanup();
    });

    it('does not implement the on-resume (edge-only) policy yet — no reposition', () => {
      const { el, cleanup } = started({ repositionPolicy: 'on-resume' });
      el.paused = false;
      el.currentTime = 90; // would snap to edge under window-exit
      el.dispatchEvent(new Event('playing'));
      expect(el.currentTime).toBe(90); // on-resume is a future variant; guard is inert
      cleanup();
    });
  });
});
