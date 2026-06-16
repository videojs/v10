import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type PartiallyResolvedVideoTrack,
  type Presentation,
  type VideoTrack,
} from '../../../media/types';
import { scheduleVideoTrackReload } from '../schedule-track-reload';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const UNRESOLVED_VIDEO: PartiallyResolvedVideoTrack = {
  type: 'video',
  id: 'v-1',
  url: 'https://example.com/video.m3u8',
  bandwidth: 1_000_000,
  mimeType: 'video/mp4',
  codecs: [],
};

function resolvedVideo(opts: { endList?: boolean; segmentCount?: number; mediaSequence?: number } = {}): VideoTrack {
  const { endList = false, segmentCount = 3, mediaSequence = 0 } = opts;
  return {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: endList ? 12 : Number.POSITIVE_INFINITY,
    startTime: 0,
    segments: Array.from({ length: segmentCount }, (_, i) => ({
      id: `segment-${mediaSequence + i}`,
      url: `${mediaSequence + i}.m4s`,
      duration: 4,
      startTime: i * 4,
    })),
    metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence, targetDuration: 4, endList } },
  };
}

function presentationWith(track: VideoTrack | PartiallyResolvedVideoTrack): Presentation {
  return {
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [{ id: 'video-set', type: 'video', switchingSets: [{ id: 'sw', type: 'video', tracks: [track] }] }],
  };
}

function makeState(presentation: MaybeResolvedPresentation, trackId: string | undefined = 'v-1') {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
    selectedVideoTrackId: signal<string | undefined>(trackId),
    videoReloadEpoch: signal<number | undefined>(undefined),
  };
}

describe('scheduleVideoTrackReload', () => {
  it('bumps the reload epoch on the target-duration cadence', async () => {
    vi.useFakeTimers();
    const state = makeState(presentationWith(resolvedVideo()));

    const reactor = scheduleVideoTrackReload.setup({ state });

    expect(state.videoReloadEpoch.get()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(4000); // one TARGETDURATION
    expect(state.videoReloadEpoch.get()).toBe(1);

    reactor.destroy();
  });

  it('polls at half cadence when the window is unchanged', async () => {
    vi.useFakeTimers();
    const state = makeState(presentationWith(resolvedVideo()));

    const reactor = scheduleVideoTrackReload.setup({ state });

    // First reload after a full TARGETDURATION (4s).
    await vi.advanceTimersByTimeAsync(4000);
    expect(state.videoReloadEpoch.get()).toBe(1);

    // Snapshot unchanged (presentation not updated) → next poll at half (2s).
    await vi.advanceTimersByTimeAsync(1999);
    expect(state.videoReloadEpoch.get()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.videoReloadEpoch.get()).toBe(2);

    reactor.destroy();
  });

  it('stays idle for a complete (endList) playlist', async () => {
    vi.useFakeTimers();
    const state = makeState(presentationWith(resolvedVideo({ endList: true })));

    const reactor = scheduleVideoTrackReload.setup({ state });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.videoReloadEpoch.get()).toBeUndefined();

    reactor.destroy();
  });

  it('keeps bumping while the track is unresolved (drives first-resolve retries)', async () => {
    vi.useFakeTimers();
    const state = makeState(presentationWith(UNRESOLVED_VIDEO));

    const reactor = scheduleVideoTrackReload.setup({ state });

    // No targetDuration available yet → fallback cadence (6s).
    await vi.advanceTimersByTimeAsync(6000);
    expect(state.videoReloadEpoch.get()).toBe(1);
    await vi.advanceTimersByTimeAsync(6000);
    expect(state.videoReloadEpoch.get()).toBe(2);

    reactor.destroy();
  });

  it('stays idle with no selected track', async () => {
    vi.useFakeTimers();
    const state = makeState(presentationWith(resolvedVideo()));
    state.selectedVideoTrackId.set(undefined);

    const reactor = scheduleVideoTrackReload.setup({ state });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(state.videoReloadEpoch.get()).toBeUndefined();

    reactor.destroy();
  });
});
