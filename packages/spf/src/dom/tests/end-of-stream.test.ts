import { describe, expect, it } from 'vitest';
import type { PartiallyResolvedVideoTrack, Presentation, VideoSelectionSet } from '../../core/types';
import type { EndOfStreamOwners, EndOfStreamState } from '../features/end-of-stream';
import { hasLastSegmentLoaded } from '../features/end-of-stream';
import { createSourceBufferActor } from '../media/source-buffer-actor';

// ============================================================================
// Helpers
// ============================================================================

const makePartialTrack = (id: string): PartiallyResolvedVideoTrack => ({
  type: 'video',
  id,
  url: `https://example.com/${id}.m3u8`,
  bandwidth: 2_000_000,
  mimeType: 'video/mp4',
  codecs: [],
});

const makeResolvedPresentation = (trackId: string): Presentation =>
  ({
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
                id: trackId,
                url: `https://example.com/${trackId}.m3u8`,
                bandwidth: 2_000_000,
                mimeType: 'video/mp4',
                codecs: ['avc1.42E01E'],
                width: 1280,
                height: 720,
                startTime: 0,
                duration: 20,
                initialization: { url: `https://example.com/${trackId}-init.mp4` },
                segments: [
                  { id: 'seg-1', url: 'https://example.com/seg1.m4s', startTime: 0, duration: 10 },
                  { id: 'seg-2', url: 'https://example.com/seg2.m4s', startTime: 10, duration: 10 },
                ],
              },
            ],
          },
        ],
      } as VideoSelectionSet,
    ],
    startTime: 0,
  }) as Presentation;

const makeUnresolvedPresentation = (trackId: string): Presentation =>
  ({
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
            tracks: [makePartialTrack(trackId)],
          },
        ],
      } as VideoSelectionSet,
    ],
    startTime: 0,
  }) as Presentation;

/** Create a mock SourceBuffer that satisfies the interface for actor construction. */
function makeMockSourceBuffer(): SourceBuffer {
  return {
    buffered: { length: 0, start: () => 0, end: () => 0 } as TimeRanges,
    updating: false,
    appendBuffer: () => {},
    remove: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as SourceBuffer;
}

/** Create a SourceBufferActor pre-seeded with the given segment IDs. */
function makeActorWithSegments(segmentIds: string[], trackId = 'some-track') {
  return createSourceBufferActor(makeMockSourceBuffer(), {
    initTrackId: trackId,
    segments: segmentIds.map((id, i) => ({ id, startTime: i * 10, duration: 10, trackId })),
  });
}

// ============================================================================
// hasLastSegmentLoaded
// ============================================================================

describe('hasLastSegmentLoaded', () => {
  describe('resolved tracks', () => {
    it('returns true when last segment ID is in actor context', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
        selectedVideoTrackId: 'v1',
      };
      const owners: EndOfStreamOwners = {
        videoBufferActor: makeActorWithSegments(['seg-1', 'seg-2'], 'v1'),
      };
      expect(hasLastSegmentLoaded(state, owners)).toBe(true);
    });

    it('returns false when last segment ID is not in actor context', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
        selectedVideoTrackId: 'v1',
      };
      // only seg-1 present; seg-2 (the last segment) is missing
      const owners: EndOfStreamOwners = {
        videoBufferActor: makeActorWithSegments(['seg-1'], 'v1'),
      };
      expect(hasLastSegmentLoaded(state, owners)).toBe(false);
    });
  });

  describe('unresolved tracks — quality switch scenario', () => {
    it('returns false when selectedVideoTrackId points to an unresolved track', () => {
      // Quality switch scenario: ABR switched selectedVideoTrackId to a new
      // (unresolved) track. The old track's segments are still in the buffer, but
      // since the new track is unresolved we cannot know if its end is covered.
      const state: EndOfStreamState = {
        presentation: makeUnresolvedPresentation('new-track'),
        selectedVideoTrackId: 'new-track',
      };
      // Actor has old track's segments — but the track is unresolved so we
      // return false before even checking the actor.
      const owners: EndOfStreamOwners = {
        videoBufferActor: makeActorWithSegments(['seg-1', 'seg-2'], 'some-track'),
      };
      expect(hasLastSegmentLoaded(state, owners)).toBe(false);
    });

    it('returns false when selectedAudioTrackId points to an unresolved track', () => {
      const state: EndOfStreamState = {
        presentation: {
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
        } as unknown as Presentation,
        selectedAudioTrackId: 'audio-new',
      };
      const owners: EndOfStreamOwners = {
        audioBufferActor: makeActorWithSegments(['seg-1', 'seg-2'], 'some-track'),
      };
      expect(hasLastSegmentLoaded(state, owners)).toBe(false);
    });
  });

  describe('no selected tracks', () => {
    it('returns true when no tracks are selected', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
      };
      expect(hasLastSegmentLoaded(state, {})).toBe(true);
    });
  });
});
