import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type Presentation,
  type VideoTrack,
} from '../../../../media/types';
import { syncLiveSeekableRange } from '../sync-live-seekable-range';

function makePresentation(): Presentation {
  // 5-segment, 2s window: [100, 110].
  const video: VideoTrack = {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime: 100,
    startDate: 1000,
    segments: [100, 102, 104, 106, 108].map((startTime, i) => ({
      id: `segment-${50 + i}`,
      url: `${50 + i}.m4s`,
      duration: 2,
      startTime,
    })),
    metadata: { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 50, targetDuration: 2, endList: false } },
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

function run(opts: { presentation?: MaybeResolvedPresentation; trackId?: string; mediaSource?: MediaSource }) {
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(opts.presentation),
    selectedVideoTrackId: signal<string | undefined>(opts.trackId),
  };
  const context = { mediaSource: signal<MediaSource | undefined>(opts.mediaSource) };
  return syncLiveSeekableRange.setup({ state, context, config: {} }) as () => void;
}

describe('syncLiveSeekableRange', () => {
  it('declares the full live window as seekable', () => {
    const ms = fakeMediaSource();
    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaSource: ms });

    // [first.startTime, last.startTime + last.duration] = [100, 110].
    expect(ms.setLiveSeekableRange).toHaveBeenCalledWith(100, 110);

    cleanup();
  });

  it('does nothing until the MediaSource is open', () => {
    const ms = fakeMediaSource('closed');
    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();

    cleanup();
  });

  it('no-ops for a complete (finite-duration) playlist — VoD / ended live', () => {
    const ms = fakeMediaSource();
    const presentation = makePresentation();
    (presentation.selectionSets[0]!.switchingSets[0]!.tracks[0] as VideoTrack).duration = 110;

    const cleanup = run({ presentation, trackId: 'v-1', mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();

    cleanup();
  });

  it('no-ops without a resolved presentation or selected track', () => {
    const ms = fakeMediaSource();
    const cleanup = run({ presentation: undefined, trackId: undefined, mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();

    cleanup();
  });

  it('leaves duration alone — owned by updateMediaSourceDuration', () => {
    const ms = fakeMediaSource();
    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaSource: ms });

    // Declares the range without touching duration (still NaN from the fake).
    expect(ms.setLiveSeekableRange).toHaveBeenCalledWith(100, 110);
    expect(ms.duration).toBeNaN();

    cleanup();
  });
});
