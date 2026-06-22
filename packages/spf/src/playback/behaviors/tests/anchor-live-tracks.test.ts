import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  isResolvedTrack,
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type Presentation,
  type VideoTrack,
} from '../../../media/types';
import { findTrack } from '../../../media/utils/tracks';
import { anchorLiveTracks } from '../anchor-live-tracks';

function makeVideoTrack(): VideoTrack {
  return {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime: 0,
    startDate: 1000,
    segments: [{ id: 'segment-85', url: 'https://example.com/85.m4s', duration: 4, startTime: 0, startDate: 1000 }],
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 85, targetDuration: 5, endList: false },
    },
  };
}

function makePresentation(track: VideoTrack): Presentation {
  return {
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [{ id: 'video-set', type: 'video', switchingSets: [{ id: 'vs', type: 'video', tracks: [track] }] }],
  };
}

describe('anchorLiveTracks', () => {
  it('anchors the selected track to the estimated stream origin', () => {
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation(makeVideoTrack())),
      selectedVideoTrackId: signal<string | undefined>('v-1'),
    };

    const cleanup = anchorLiveTracks.setup({ state, context: {}, config: {} }) as () => void;

    const track = findTrack(state.presentation.get()!, 'video', 'v-1');
    expect(track && isResolvedTrack(track)).toBe(true);
    if (!track || !isResolvedTrack(track)) return;
    // origin offset = (85 − 0) × 4 = 340; idempotent (no double-application).
    expect(track.startTime).toBe(340);
    expect(track.segments[0]?.startTime).toBe(340);
    // startDate re-based to the seq-0 wall clock: 1000 − 340 = 660.
    expect(track.startDate).toBe(660);

    cleanup();
  });

  it('no-ops when the track carries no startDate', () => {
    const track = makeVideoTrack();
    track.startDate = undefined;
    track.segments = [{ id: 'segment-85', url: 'https://example.com/85.m4s', duration: 4, startTime: 0 }];
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation(track)),
      selectedVideoTrackId: signal<string | undefined>('v-1'),
    };

    const cleanup = anchorLiveTracks.setup({ state, context: {}, config: {} }) as () => void;

    expect(findTrack(state.presentation.get()!, 'video', 'v-1')?.startTime).toBe(0);

    cleanup();
  });

  it('no-ops without a selected track', () => {
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation(makeVideoTrack())),
      selectedVideoTrackId: signal<string | undefined>(undefined),
    };

    const cleanup = anchorLiveTracks.setup({ state, context: {}, config: {} }) as () => void;

    expect(findTrack(state.presentation.get()!, 'video', 'v-1')?.startTime).toBe(0);

    cleanup();
  });

  describe('buffer pin', () => {
    it('pins the track onto the actual buffered position, overriding the estimate', () => {
      const state = {
        presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation(makeVideoTrack())),
        selectedVideoTrackId: signal<string | undefined>('v-1'),
      };

      const cleanup = anchorLiveTracks.setup({
        state,
        context: {},
        config: { resolveBufferedAnchor: () => ({ segmentId: 'segment-85', actualStart: 500 }) },
      }) as () => void;

      const track = findTrack(state.presentation.get()!, 'video', 'v-1');
      expect(track && isResolvedTrack(track)).toBe(true);
      if (!track || !isResolvedTrack(track)) return;
      // Buffer wins over the estimate (which would place it at 340).
      expect(track.startTime).toBe(500);
      expect(track.segments[0]?.startTime).toBe(500);

      cleanup();
    });

    it('pins once — a later reload is left to the parser (no re-pin even if the anchor drifts)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      let actualStart = 500;
      const state = {
        presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation(makeVideoTrack())),
        selectedVideoTrackId: signal<string | undefined>('v-1'),
      };

      const cleanup = anchorLiveTracks.setup({
        state,
        context: {},
        config: { resolveBufferedAnchor: () => ({ segmentId: 'segment-85', actualStart }) },
      }) as () => void;

      expect((findTrack(state.presentation.get()!, 'video', 'v-1') as { startTime: number }).startTime).toBe(500);

      // Reload carrying the pinned timeline forward; the resolver now disagrees.
      actualStart = 600;
      const carried = makeVideoTrack();
      carried.startTime = 500;
      carried.segments = [{ ...carried.segments[0]!, startTime: 500 }];
      state.presentation.set(makePresentation(carried));

      // Maintain mode: stays at 500 (the parser owns carry-forward), not re-pinned to 600.
      expect((findTrack(state.presentation.get()!, 'video', 'v-1') as { startTime: number }).startTime).toBe(500);

      cleanup();
      warn.mockRestore();
    });
  });
});
