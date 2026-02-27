import { describe, expect, it } from 'vitest';
import type { PartiallyResolvedVideoTrack, Presentation, VideoSelectionSet } from '../../core/types';
import type { EndOfStreamState } from '../features/end-of-stream';
import { hasLastSegmentLoaded } from '../features/end-of-stream';
import type { BufferState, SourceBufferState } from '../features/load-segments';

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

const completedBuffer: SourceBufferState = {
  initTrackId: 'some-track',
  segments: [
    { id: 'seg-1', trackId: 'some-track' },
    { id: 'seg-2', trackId: 'some-track' },
  ],
  completed: true,
};

// ============================================================================
// hasLastSegmentLoaded
// ============================================================================

describe('hasLastSegmentLoaded', () => {
  describe('resolved tracks', () => {
    it('returns true when all segments are loaded (completed=true)', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
        selectedVideoTrackId: 'v1',
        bufferState: { video: completedBuffer } as BufferState,
      };
      expect(hasLastSegmentLoaded(state)).toBe(true);
    });

    it('returns false when segments not yet fully loaded (completed=false)', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
        selectedVideoTrackId: 'v1',
        bufferState: {
          video: { initTrackId: 'v1', segments: [{ id: 'seg-1', trackId: 'v1' }], completed: false },
        } as BufferState,
      };
      expect(hasLastSegmentLoaded(state)).toBe(false);
    });
  });

  describe('unresolved tracks — quality switch scenario', () => {
    it('returns false when selectedVideoTrackId points to an unresolved track', () => {
      // This is the Bug 2 scenario: ABR switched track ID to a new (unresolved)
      // track, but the old video buffer still has completed=true. Without the fix,
      // hasLastSegmentLoaded returns true, causing premature endOfStream.
      const state: EndOfStreamState = {
        presentation: makeUnresolvedPresentation('new-track'),
        selectedVideoTrackId: 'new-track',
        bufferState: {
          // Old track's completed flag is still true
          video: completedBuffer,
        } as BufferState,
      };
      expect(hasLastSegmentLoaded(state)).toBe(false);
    });

    it('returns false when selectedAudioTrackId points to an unresolved track', () => {
      // Audio equivalent of the above
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
        bufferState: {
          audio: completedBuffer,
        } as BufferState,
      };
      expect(hasLastSegmentLoaded(state)).toBe(false);
    });
  });

  describe('no selected tracks', () => {
    it('returns true when no tracks are selected', () => {
      const state: EndOfStreamState = {
        presentation: makeResolvedPresentation('v1'),
        bufferState: {} as BufferState,
      };
      expect(hasLastSegmentLoaded(state)).toBe(true);
    });
  });
});
