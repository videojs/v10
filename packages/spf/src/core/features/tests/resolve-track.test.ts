import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../events/create-event-stream';
import { createState } from '../../state/create-state';
import type {
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
} from '../../types';
import { isResolvedTrack } from '../../types';
import type { TrackResolutionAction, TrackResolutionState } from '../resolve-track';
import { resolveTrack } from '../resolve-track';

describe('resolveTrack (video)', () => {
  it('resolves unresolved video track', async () => {
    // Arrange
    const unresolved: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-1',
      url: 'http://example.com/variant1.m3u8',
      bandwidth: 1000000,
      mimeType: 'video/mp4',
      codecs: [],
    };

    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'switching-1',
              type: 'video',
              tracks: [unresolved],
            },
          ],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedVideoTrackId: 'track-1',
    });

    const events = createEventStream<TrackResolutionAction>();

    // Mock fetch to return media playlist with absolute URLs
    global.fetch = vi.fn().mockImplementation(
      async () =>
        new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
http://example.com/segment1.m4s
#EXTINF:10.0,
http://example.com/segment2.m4s
#EXT-X-ENDLIST`)
    );

    // Act
    const cleanup = resolveTrack(state, events, { type: 'video' as const });
    events.dispatch({ type: 'pause' });

    // Wait for resolution
    await vi.waitFor(() => {
      const { presentation: currentPres } = state.current;
      const track = findTrackById(currentPres!, 'track-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    // Assert - track should now be resolved with segments
    const resolvedPres = state.current.presentation!;
    const resolvedTrack = findTrackById(resolvedPres, 'track-1');

    expect(isResolvedTrack(resolvedTrack!)).toBe(true);
    if (isResolvedTrack(resolvedTrack!)) {
      expect(resolvedTrack.segments).toBeDefined();
      expect(resolvedTrack.segments.length).toBeGreaterThan(0);
    }

    cleanup();
  });

  it('does not resolve when track is already resolved', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    // Create presentation with already-resolved track
    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'switching-1',
              type: 'video',
              tracks: [
                {
                  type: 'video',
                  id: 'track-1',
                  url: 'http://example.com/variant1.m3u8',
                  bandwidth: 1000000,
                  mimeType: 'video/mp4',
                  codecs: ['avc1.4d401f'],
                  width: 1920,
                  height: 1080,
                  frameRate: { frameRateNumerator: 30 },
                  startTime: 0,
                  duration: 0,
                  initialization: { url: 'http://example.com/init.mp4' },
                  segments: [], // Already resolved!
                },
              ],
            },
          ],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedVideoTrackId: 'track-1',
    });

    const events = createEventStream<TrackResolutionAction>();
    const cleanup = resolveTrack(state, events, { type: 'video' as const });
    events.dispatch({ type: 'pause' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not resolve when no track is selected', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedVideoTrackId: undefined,
    });

    const events = createEventStream<TrackResolutionAction>();
    const cleanup = resolveTrack(state, events, { type: 'video' as const });
    events.dispatch({ type: 'pause' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();

    cleanup();
  });
});

describe('resolveTrack (audio)', () => {
  it('resolves unresolved audio track', async () => {
    const unresolved: PartiallyResolvedAudioTrack = {
      type: 'audio',
      id: 'audio-1',
      url: 'http://example.com/audio.m3u8',
      groupId: 'audio-group',
      name: 'English',
      bandwidth: 128000,
      mimeType: 'audio/mp4',
      sampleRate: 48000,
      channels: 2,
      codecs: ['mp4a.40.2'],
    };

    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        {
          id: 'audio-set',
          type: 'audio',
          switchingSets: [
            {
              id: 'switching-1',
              type: 'audio',
              tracks: [unresolved],
            },
          ],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedAudioTrackId: 'audio-1',
    });

    const events = createEventStream<TrackResolutionAction>();

    global.fetch = vi.fn().mockImplementation(
      async () =>
        new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
http://example.com/segment1.m4s
#EXT-X-ENDLIST`)
    );

    const cleanup = resolveTrack(state, events, { type: 'audio' as const });
    events.dispatch({ type: 'pause' });

    await vi.waitFor(() => {
      const { presentation: currentPres } = state.current;
      const track = findTrackById(currentPres!, 'audio-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    const resolvedPres = state.current.presentation!;
    const resolvedTrack = findTrackById(resolvedPres, 'audio-1');

    expect(isResolvedTrack(resolvedTrack!)).toBe(true);
    if (isResolvedTrack(resolvedTrack!)) {
      expect(resolvedTrack.segments).toBeDefined();
      expect(resolvedTrack.segments.length).toBeGreaterThan(0);
      expect(resolvedTrack.type).toBe('audio');
    }

    cleanup();
  });
});

describe('resolveTrack (text)', () => {
  it('resolves unresolved text track', async () => {
    const unresolved: PartiallyResolvedTextTrack = {
      type: 'text',
      id: 'text-1',
      url: 'http://example.com/subtitles.m3u8',
      groupId: 'subs',
      label: 'English',
      kind: 'subtitles',
      bandwidth: 1000,
      mimeType: 'text/vtt',
    };

    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        {
          id: 'text-set',
          type: 'text',
          switchingSets: [
            {
              id: 'switching-1',
              type: 'text',
              tracks: [unresolved],
            },
          ],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedTextTrackId: 'text-1',
    });

    const events = createEventStream<TrackResolutionAction>();

    global.fetch = vi.fn().mockImplementation(
      async () =>
        new Response(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:6.0,
http://example.com/subtitle0.webvtt
#EXTINF:6.0,
http://example.com/subtitle1.webvtt
#EXT-X-ENDLIST`)
    );

    const cleanup = resolveTrack(state, events, { type: 'text' as const });
    events.dispatch({ type: 'pause' });

    await vi.waitFor(() => {
      const { presentation: currentPres } = state.current;
      const track = findTrackById(currentPres!, 'text-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    const resolvedPres = state.current.presentation!;
    const resolvedTrack = findTrackById(resolvedPres, 'text-1');

    expect(isResolvedTrack(resolvedTrack!)).toBe(true);
    if (isResolvedTrack(resolvedTrack!)) {
      expect(resolvedTrack.type).toBe('text');
    }

    cleanup();
  });
});

// Helper to find track by ID in presentation
function findTrackById(presentation: Presentation, trackId: string): PartiallyResolvedVideoTrack | any | undefined {
  for (const selectionSet of presentation.selectionSets) {
    for (const switchingSet of selectionSet.switchingSets) {
      const track = switchingSet.tracks.find((t) => t.id === trackId);
      if (track) return track;
    }
  }
  return undefined;
}
