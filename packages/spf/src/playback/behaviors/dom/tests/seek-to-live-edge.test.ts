import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type Presentation,
  type VideoTrack,
} from '../../../../media/types';
import { seekToLiveEdge } from '../seek-to-live-edge';

function makePresentation(): Presentation {
  // 5-segment, 2s window: [100, 110]. HOLD-BACK = 3 × targetDuration(2) = 6,
  // so the live-edge start is 110 − 6 = 104.
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

function run(opts: {
  presentation?: MaybeResolvedPresentation;
  trackId?: string;
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
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
  return seekToLiveEdge.setup({ state, context, config: {} }) as () => void;
}

describe('seekToLiveEdge', () => {
  it('declares the full seekable window and seeks near the live edge (HOLD-BACK behind)', () => {
    const ms = fakeMediaSource();
    const el = { currentTime: 0 } as HTMLMediaElement;

    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    // Full DVR window stays seekable: [first.startTime, last.startTime + last.duration] = [100, 110].
    expect(ms.setLiveSeekableRange).toHaveBeenCalledWith(100, 110);
    expect(ms.duration).toBe(Number.POSITIVE_INFINITY);
    // Start HOLD-BACK (3 × 2s) behind the edge: 110 − 6 = 104, not the window start.
    expect(el.currentTime).toBe(104);

    cleanup();
  });

  it('does nothing until the MediaSource is open', () => {
    const ms = fakeMediaSource('closed');
    const el = { currentTime: 0 } as HTMLMediaElement;

    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();
    expect(el.currentTime).toBe(0);

    cleanup();
  });

  it('no-ops without a resolved presentation or selected track', () => {
    const ms = fakeMediaSource();
    const el = { currentTime: 0 } as HTMLMediaElement;

    const cleanup = run({ presentation: undefined, trackId: undefined, mediaElement: el, mediaSource: ms });

    expect(ms.setLiveSeekableRange).not.toHaveBeenCalled();
    expect(el.currentTime).toBe(0);

    cleanup();
  });
});
