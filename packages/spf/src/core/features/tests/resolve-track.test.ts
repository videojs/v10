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
    const cleanup = resolveTrack({ state, events }, { type: 'video' as const });
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
    const cleanup = resolveTrack({ state, events }, { type: 'video' as const });
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
    const cleanup = resolveTrack({ state, events }, { type: 'video' as const });
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

    const cleanup = resolveTrack({ state, events }, { type: 'audio' as const });
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

    const cleanup = resolveTrack({ state, events }, { type: 'text' as const });
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

describe('resolveTrack — concurrent resolution', () => {
  it('resolves both tracks concurrently when selectedTrackId changes mid-resolution', async () => {
    // Verifies the concurrent Map-based model: when the selected track changes
    // while a prior resolution is in flight, both tracks resolve independently
    // without aborting each other. Each track ID is fetched at most once.
    const trackA: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-a',
      url: 'http://example.com/track-a.m3u8',
      bandwidth: 4_000_000,
      mimeType: 'video/mp4',
      codecs: [],
    };
    const trackB: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-b',
      url: 'http://example.com/track-b.m3u8',
      bandwidth: 600_000,
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
          switchingSets: [{ id: 'sw-1', type: 'video', tracks: [trackA, trackB] }],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedVideoTrackId: 'track-a',
    });
    const events = createEventStream<TrackResolutionAction>();

    const makePlaylist = (segUrl: string) => `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
${segUrl}
#EXT-X-ENDLIST`;

    // Both fetches resolve immediately — concurrent resolution, no abort.
    global.fetch = vi.fn().mockImplementation((requestOrUrl: Request | string) => {
      const url = requestOrUrl instanceof Request ? requestOrUrl.url : requestOrUrl;
      if (url.includes('track-a')) return Promise.resolve(new Response(makePlaylist('http://example.com/a-seg1.m4s')));
      return Promise.resolve(new Response(makePlaylist('http://example.com/b-seg1.m4s')));
    });

    const cleanup = resolveTrack({ state, events }, { type: 'video' as const });
    events.dispatch({ type: 'pause' });

    // While track-a resolution is in flight, switch to track-b.
    state.patch({ selectedVideoTrackId: 'track-b' });

    // Both tracks should be resolved (concurrently, neither aborts the other).
    await vi.waitFor(() => {
      const pres = state.current.presentation!;
      expect(isResolvedTrack(findTrackById(pres, 'track-a')!)).toBe(true);
      expect(isResolvedTrack(findTrackById(pres, 'track-b')!)).toBe(true);
    });

    // Each track URL should have been fetched exactly once.
    const fetchedUrls = vi.mocked(global.fetch).mock.calls.map((call) => {
      const arg = call[0];
      return arg instanceof Request ? arg.url : String(arg);
    });
    expect(fetchedUrls.filter((u) => u.includes('track-a'))).toHaveLength(1);
    expect(fetchedUrls.filter((u) => u.includes('track-b'))).toHaveLength(1);

    cleanup();
  });

  it('does not fetch the same track twice when state changes rapidly', async () => {
    const trackA: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-a',
      url: 'http://example.com/track-a.m3u8',
      bandwidth: 2_000_000,
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
          switchingSets: [{ id: 'sw-1', type: 'video', tracks: [trackA] }],
        },
      ],
      startTime: 0,
    };

    const state = createState<TrackResolutionState>({
      presentation,
      selectedVideoTrackId: 'track-a',
    });
    const events = createEventStream<TrackResolutionAction>();

    global.fetch = vi.fn().mockResolvedValue(
      new Response(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
http://example.com/a-seg1.m4s
#EXT-X-ENDLIST`)
    );

    const cleanup = resolveTrack({ state, events }, { type: 'video' as const });
    events.dispatch({ type: 'pause' });

    // Trigger multiple state changes while track-a is resolving.
    state.patch({ selectedVideoTrackId: 'track-a' });
    state.patch({ selectedVideoTrackId: 'track-a' });

    await vi.waitFor(() => {
      expect(isResolvedTrack(findTrackById(state.current.presentation!, 'track-a')!)).toBe(true);
    });

    // Should only have been fetched once despite multiple state triggers.
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);

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
