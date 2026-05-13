import { describe, expect, it } from 'vitest';
import type { MaybeResolvedPresentation, Presentation, Segment, VideoTrack } from '../../../types';
import type { TrackSelectionState } from '../../../utils/track-selection';
import { type AppendedSegment, hasLastSegmentLoaded, isLastSegmentAppended } from '../end-of-stream';

// ============================================================================
// Helpers
// ============================================================================

function makeSegments(count: number): Segment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `seg-${i}`,
    url: `https://example.com/seg-${i}.m4s`,
    startTime: i * 2.5,
    duration: 2.5,
  }));
}

function makeResolvedVideoTrack(segmentCount: number, id = 'video-1'): VideoTrack {
  return {
    id,
    type: 'video' as const,
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    bandwidth: 1_000_000,
    initialization: { id: 'init', url: 'https://example.com/init.mp4' },
    segments: makeSegments(segmentCount),
    startTime: 0,
    duration: segmentCount * 2.5,
    codecs: 'avc1.64001f',
  } as unknown as VideoTrack;
}

function makePresentation(videoTrack: VideoTrack, id = 'pres-1'): Presentation {
  return {
    id,
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [{ type: 'video', switchingSets: [{ tracks: [videoTrack] }] }],
  } as unknown as Presentation;
}

function appendedFromIds(segmentIds: string[]): AppendedSegment[] {
  return segmentIds.map((id) => ({ id }));
}

// ============================================================================
// isLastSegmentAppended
// ============================================================================

describe('isLastSegmentAppended', () => {
  it('returns true when expected list is empty', () => {
    expect(isLastSegmentAppended([], [])).toBe(true);
    expect(isLastSegmentAppended([], appendedFromIds(['seg-0']))).toBe(true);
    expect(isLastSegmentAppended([], undefined)).toBe(true);
  });

  it('returns false when appended list is undefined or empty', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }], undefined)).toBe(false);
    expect(isLastSegmentAppended([{ id: 'seg-0' }], [])).toBe(false);
  });

  it('returns true when the temporally last segment is present', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appendedFromIds(['seg-0', 'seg-1']))).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    expect(
      isLastSegmentAppended(
        [{ id: 'seg-0' }, { id: 'seg-1' }, { id: 'seg-2' }, { id: 'seg-3' }],
        appendedFromIds(['seg-2', 'seg-3'])
      )
    ).toBe(true);
  });

  it('returns false when the last segment ID is missing', () => {
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appendedFromIds(['seg-0']))).toBe(false);
  });

  it('returns false when the last segment is present but marked partial', () => {
    const appended: AppendedSegment[] = [{ id: 'seg-0' }, { id: 'seg-1', partial: true }];
    expect(isLastSegmentAppended([{ id: 'seg-0' }, { id: 'seg-1' }], appended)).toBe(false);
  });
});

// ============================================================================
// hasLastSegmentLoaded
// ============================================================================

describe('hasLastSegmentLoaded', () => {
  it('returns true when no tracks are selected', () => {
    const state: TrackSelectionState = { presentation: { id: 'p', url: 'x' } as Presentation };
    expect(hasLastSegmentLoaded(state, {})).toBe(true);
  });

  it('returns false when last segment ID is not in the video appended list', () => {
    const track = makeResolvedVideoTrack(4);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(hasLastSegmentLoaded(state, { video: appendedFromIds(['seg-0', 'seg-1', 'seg-2']) })).toBe(false);
  });

  it('returns true when last segment ID is present', () => {
    const track = makeResolvedVideoTrack(4);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(hasLastSegmentLoaded(state, { video: appendedFromIds(['seg-0', 'seg-1', 'seg-2', 'seg-3']) })).toBe(true);
  });

  it('returns true after back-buffer flushing when last segment ID remains', () => {
    const track = makeResolvedVideoTrack(10);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(hasLastSegmentLoaded(state, { video: appendedFromIds(['seg-7', 'seg-8', 'seg-9']) })).toBe(true);
  });

  it('returns true on the seek-back scenario — last segment present alongside re-loaded earlier segments', () => {
    const track = makeResolvedVideoTrack(10);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(hasLastSegmentLoaded(state, { video: appendedFromIds(['seg-0', 'seg-7', 'seg-8', 'seg-9']) })).toBe(true);
  });

  it('returns true when track has no segments', () => {
    const track = makeResolvedVideoTrack(0);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    expect(hasLastSegmentLoaded(state, { video: [] })).toBe(true);
  });

  it('returns false when last segment is present but marked partial', () => {
    const track = makeResolvedVideoTrack(4);
    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      presentation: makePresentation(track),
    };
    const appended: AppendedSegment[] = [
      { id: 'seg-0' },
      { id: 'seg-1' },
      { id: 'seg-2' },
      { id: 'seg-3', partial: true },
    ];
    expect(hasLastSegmentLoaded(state, { video: appended })).toBe(false);
  });

  it('returns false when video last segment is loaded but audio last segment is not', () => {
    const videoTrack = makeResolvedVideoTrack(4);
    const presentation = {
      id: 'pres-1',
      url: 'https://example.com/playlist.m3u8',
      selectionSets: [
        { type: 'video', switchingSets: [{ tracks: [videoTrack] }] },
        {
          type: 'audio',
          switchingSets: [
            {
              tracks: [
                {
                  id: 'audio-1',
                  type: 'audio',
                  segments: makeSegments(4).map((s) => ({ ...s, id: `audio-${s.id}` })),
                },
              ],
            },
          ],
        },
      ],
    } as unknown as Presentation;

    const state: TrackSelectionState = {
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
      presentation,
    };
    expect(
      hasLastSegmentLoaded(state, {
        video: appendedFromIds(['seg-3']),
        audio: appendedFromIds(['audio-seg-0']),
      })
    ).toBe(false);
  });

  describe('unresolved tracks — quality switch scenario', () => {
    it('returns false when selectedVideoTrackId points to an unresolved track', () => {
      const presentation = {
        id: 'pres',
        url: 'https://example.com/playlist.m3u8',
        selectionSets: [
          {
            id: 'video-set',
            type: 'video' as const,
            switchingSets: [
              {
                id: 'sw',
                type: 'video' as const,
                tracks: [
                  {
                    type: 'video' as const,
                    id: 'new-track',
                    url: 'https://example.com/new-track.m3u8',
                    bandwidth: 2_000_000,
                    mimeType: 'video/mp4',
                    codecs: [],
                  },
                ],
              },
            ],
          },
        ],
        startTime: 0,
      } as unknown as MaybeResolvedPresentation;
      const state: TrackSelectionState = {
        presentation,
        selectedVideoTrackId: 'new-track',
      };
      // Buffer still carries segments for the old track; the new track is
      // unresolved so we cannot yet tell whether its last segment is loaded.
      expect(hasLastSegmentLoaded(state, { video: appendedFromIds(['seg-1', 'seg-2']) })).toBe(false);
    });

    it('returns false when selectedAudioTrackId points to an unresolved track', () => {
      const presentation = {
        id: 'pres',
        url: 'https://example.com/playlist.m3u8',
        selectionSets: [
          {
            id: 'audio-set',
            type: 'audio' as const,
            switchingSets: [
              {
                id: 'sw',
                type: 'audio' as const,
                tracks: [
                  {
                    type: 'audio' as const,
                    id: 'audio-new',
                    url: 'https://example.com/audio.m3u8',
                    bandwidth: 128_000,
                    mimeType: 'audio/mp4',
                    codecs: [],
                    groupId: 'audio',
                    name: 'English',
                  },
                ],
              },
            ],
          },
        ],
        startTime: 0,
      } as unknown as MaybeResolvedPresentation;
      const state: TrackSelectionState = {
        presentation,
        selectedAudioTrackId: 'audio-new',
      };
      expect(hasLastSegmentLoaded(state, { audio: appendedFromIds(['seg-1', 'seg-2']) })).toBe(false);
    });
  });
});
