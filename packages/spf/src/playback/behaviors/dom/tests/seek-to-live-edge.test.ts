import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation, VideoTrack } from '../../../../media/types';
import { seekToLiveEdge } from '../seek-to-live-edge';

function makePresentation(): Presentation {
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
    segments: [
      { id: 'segment-50', url: '50.m4s', duration: 2, startTime: 100 },
      { id: 'segment-51', url: '51.m4s', duration: 2, startTime: 102 },
      { id: 'segment-52', url: '52.m4s', duration: 2, startTime: 104 },
    ],
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
  it('declares the live seekable range and seeks into the window', () => {
    const ms = fakeMediaSource();
    const el = { currentTime: 0 } as HTMLMediaElement;

    const cleanup = run({ presentation: makePresentation(), trackId: 'v-1', mediaElement: el, mediaSource: ms });

    // window = [first.startTime, last.startTime + last.duration] = [100, 106].
    expect(ms.setLiveSeekableRange).toHaveBeenCalledWith(100, 106);
    expect(ms.duration).toBe(Number.POSITIVE_INFINITY);
    expect(el.currentTime).toBe(100);

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
