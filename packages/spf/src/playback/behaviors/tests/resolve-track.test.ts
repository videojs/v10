import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type {
  MaybeResolvedPresentation,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
} from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import type { TrackResolutionState } from '../resolve-track';
import { resolveTrack } from '../resolve-track';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeState(initial: TrackResolutionState = {}): StateSignals<TrackResolutionState> {
  return {
    presentation: signal<Presentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
  };
}

describe('resolveTrack (video)', () => {
  it('resolves unresolved video track', async () => {
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

    const state = makeState({ presentation, selectedVideoTrackId: 'track-1' });

    vi.spyOn(globalThis, 'fetch').mockImplementation(
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

    const cleanup = resolveTrack({ state }, { type: 'video' as const });

    await vi.waitFor(() => {
      const currentPres = state.presentation.get();
      const track = findTrackById(currentPres!, 'track-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    const resolvedPres = state.presentation.get()!;
    const resolvedTrack = findTrackById(resolvedPres, 'track-1');

    expect(isResolvedTrack(resolvedTrack!)).toBe(true);
    if (isResolvedTrack(resolvedTrack!)) {
      expect(resolvedTrack.segments).toBeDefined();
      expect(resolvedTrack.segments.length).toBeGreaterThan(0);
    }

    cleanup();
  });

  it('does not resolve when track is already resolved', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

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
                  segments: [],
                },
              ],
            },
          ],
        },
      ],
      startTime: 0,
    };

    const state = makeState({ presentation, selectedVideoTrackId: 'track-1' });

    const cleanup = resolveTrack({ state }, { type: 'video' as const });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not resolve when no track is selected', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [],
      startTime: 0,
    };

    const state = makeState({ presentation });

    const cleanup = resolveTrack({ state }, { type: 'video' as const });

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

    const state = makeState({ presentation, selectedAudioTrackId: 'audio-1' });

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
http://example.com/segment1.m4s
#EXT-X-ENDLIST`)
    );

    const cleanup = resolveTrack({ state }, { type: 'audio' as const });

    await vi.waitFor(() => {
      const currentPres = state.presentation.get();
      const track = findTrackById(currentPres!, 'audio-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    const resolvedPres = state.presentation.get()!;
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

    const state = makeState({ presentation, selectedTextTrackId: 'text-1' });

    vi.spyOn(globalThis, 'fetch').mockImplementation(
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

    const cleanup = resolveTrack({ state }, { type: 'text' as const });

    await vi.waitFor(() => {
      const currentPres = state.presentation.get();
      const track = findTrackById(currentPres!, 'text-1');
      expect(isResolvedTrack(track!)).toBe(true);
    });

    const resolvedPres = state.presentation.get()!;
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

    const state = makeState({ presentation, selectedVideoTrackId: 'track-a' });

    const makePlaylist = (segUrl: string) => `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
${segUrl}
#EXT-X-ENDLIST`;

    vi.spyOn(globalThis, 'fetch').mockImplementation((requestOrUrl: RequestInfo | URL) => {
      const url = requestOrUrl instanceof Request ? requestOrUrl.url : String(requestOrUrl);
      if (url.includes('track-a')) return Promise.resolve(new Response(makePlaylist('http://example.com/a-seg1.m4s')));
      return Promise.resolve(new Response(makePlaylist('http://example.com/b-seg1.m4s')));
    });

    const cleanup = resolveTrack({ state }, { type: 'video' as const });

    state.selectedVideoTrackId.set('track-b');

    await vi.waitFor(() => {
      const pres = state.presentation.get()!;
      expect(isResolvedTrack(findTrackById(pres, 'track-a')!)).toBe(true);
      expect(isResolvedTrack(findTrackById(pres, 'track-b')!)).toBe(true);
    });

    const fetchedUrls = vi.mocked(globalThis.fetch).mock.calls.map((call) => {
      const arg: RequestInfo | URL = call[0];
      return arg instanceof Request ? arg.url : String(arg);
    });
    expect(fetchedUrls.filter((u: string) => u.includes('track-a'))).toHaveLength(1);
    expect(fetchedUrls.filter((u: string) => u.includes('track-b'))).toHaveLength(1);

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

    const state = makeState({ presentation, selectedVideoTrackId: 'track-a' });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
http://example.com/a-seg1.m4s
#EXT-X-ENDLIST`)
    );

    const cleanup = resolveTrack({ state }, { type: 'video' as const });

    // Trigger multiple state changes while track-a is resolving.
    state.selectedVideoTrackId.set('track-a');
    state.selectedVideoTrackId.set('track-a');

    await vi.waitFor(() => {
      expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-a')!)).toBe(true);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    cleanup();
  });
});

// Helper to find track by ID in presentation
function findTrackById(
  presentation: MaybeResolvedPresentation,
  trackId: string
): PartiallyResolvedVideoTrack | any | undefined {
  for (const selectionSet of presentation.selectionSets ?? []) {
    for (const switchingSet of selectionSet.switchingSets) {
      const track = switchingSet.tracks.find((t) => t.id === trackId);
      if (track) return track;
    }
  }
  return undefined;
}
