import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { TaskLike } from '../../../core/tasks/task';
import { positionAllTracksToAnchor } from '../../../media/presentation-anchor';
import type {
  MaybeResolvedPresentation,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedTextTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  ResolvedTrack,
} from '../../../media/types';
import { isResolvedTrack } from '../../../media/types';
import { type ResolveTrackState, resolveAudioTrack, resolveTextTrack, resolveVideoTrack } from '../resolve-track';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeState(initial: ResolveTrackState = {}): StateSignals<ResolveTrackState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
    failedCdns: signal<string[] | undefined>(initial.failedCdns),
  };
}

describe('resolveVideoTrack', () => {
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

    const reactor = resolveVideoTrack.setup({ state });

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

    reactor.destroy();
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

    const reactor = resolveVideoTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();

    reactor.destroy();
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

    const reactor = resolveVideoTrack.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchSpy).not.toHaveBeenCalled();

    reactor.destroy();
  });
});

describe('resolveAudioTrack', () => {
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

    const reactor = resolveAudioTrack.setup({ state });

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

    reactor.destroy();
  });
});

describe('resolveTextTrack', () => {
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

    const reactor = resolveTextTrack.setup({ state });

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

    reactor.destroy();
  });
});

describe('resolveVideoTrack — concurrent resolution', () => {
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

    const reactor = resolveVideoTrack.setup({ state });

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

    reactor.destroy();
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

    const reactor = resolveVideoTrack.setup({ state });

    // Trigger multiple state changes while track-a is resolving.
    state.selectedVideoTrackId.set('track-a');
    state.selectedVideoTrackId.set('track-a');

    await vi.waitFor(() => {
      expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-a')!)).toBe(true);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    reactor.destroy();
  });
});

describe('resolveVideoTrack — live reload', () => {
  const LIVE_PLAYLIST = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="http://example.com/init.mp4"
#EXTINF:4.0,
http://example.com/seg0.m4s`;

  function liveVideoPresentation(): Presentation {
    const unresolved: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-1',
      url: 'http://example.com/variant1.m3u8',
      bandwidth: 1_000_000,
      mimeType: 'video/mp4',
      codecs: [],
    };
    return {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        { id: 'video-set', type: 'video', switchingSets: [{ id: 'sw-1', type: 'video', tracks: [unresolved] }] },
      ],
      startTime: 0,
    };
  }

  // Flush pending macrotasks so "did NOT happen" assertions are meaningful.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('re-resolves while the window is incomplete (reschedule resolves)', async () => {
    const state = makeState({ presentation: liveVideoPresentation(), selectedVideoTrackId: 'track-1' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(LIVE_PLAYLIST));

    // Re-run twice, then stop — bounds the loop without timers.
    let cycles = 0;
    const reschedule = async () => cycles++ < 2;
    const reactor = resolveVideoTrack.setup({ state, config: { reschedule } });

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3)); // initial + 2 reloads
    expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-1')!)).toBe(true);

    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    reactor.destroy();
  });

  it('resolves once and never reloads when no reschedule is configured (VoD/non-live)', async () => {
    const state = makeState({ presentation: liveVideoPresentation(), selectedVideoTrackId: 'track-1' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(LIVE_PLAYLIST));

    const reactor = resolveVideoTrack.setup({ state });

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    reactor.destroy();
  });

  it('stops reloading once the playlist completes (reschedule returns null)', async () => {
    const state = makeState({ presentation: liveVideoPresentation(), selectedVideoTrackId: 'track-1' });
    // Complete (ENDLIST) → finite duration → reschedule stops after the first resolve.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(`${LIVE_PLAYLIST}\n#EXT-X-ENDLIST`));

    // Observe the resolved track; stop (false) once it's complete.
    const reschedule = async (task: TaskLike<ResolvedTrack>) => {
      const current = await task.run().catch(() => undefined);
      return !(current && Number.isFinite(current.duration));
    };
    const reactor = resolveVideoTrack.setup({ state, config: { reschedule } });

    await vi.waitFor(() => expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-1')!)).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    reactor.destroy();
  });

  it('stops resolving on a fetch failure (an errored run is terminal — no retry)', async () => {
    const state = makeState({ presentation: liveVideoPresentation(), selectedVideoTrackId: 'track-1' });
    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls += 1;
      throw new TypeError('Failed to fetch');
    });

    // Even a reschedule that would keep going can't revive an errored run — the
    // rejected run ends the recurrence (retry, if wanted, belongs in the fetch layer).
    const reschedule = async () => true;
    const reactor = resolveVideoTrack.setup({ state, config: { reschedule } });

    await vi.waitFor(() => expect(calls).toBe(1));
    await flush();
    expect(calls).toBe(1); // no retry
    expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-1')!)).toBe(false);

    reactor.destroy();
  });

  it('sets presentation.streamType from the parsed playlist', async () => {
    const state = makeState({ presentation: liveVideoPresentation(), selectedVideoTrackId: 'track-1' });
    // No EXT-X-PLAYLIST-TYPE:VOD → live.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(LIVE_PLAYLIST));

    const reactor = resolveVideoTrack.setup({ state });

    await vi.waitFor(() => expect(state.presentation.get()?.streamType).toBe('live'));

    reactor.destroy();
  });
});

describe('resolveVideoTrack — concurrent anchor stamp during fetch', () => {
  // Regression: anchor-live-tracks establishes the shared live anchor and stamps
  // every track's timeline while a track resolution's playlist fetch is in
  // flight. The resolution must parse against the track as stamped — not the
  // pre-fetch snapshot — or it clobbers the stamp and strands the track off the
  // anchor permanently (anchoring is pin-once). Observed live as video never
  // buffering: its model timeline sat ~hundreds of seconds off currentTime.
  it('honors a startDate stamped onto the shell mid-fetch (parses against the live snapshot)', async () => {
    const unresolved: PartiallyResolvedVideoTrack = {
      type: 'video',
      id: 'track-1',
      url: 'http://example.com/variant1.m3u8',
      bandwidth: 1_000_000,
      mimeType: 'video/mp4',
      codecs: [],
    };
    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [
        { id: 'video-set', type: 'video', switchingSets: [{ id: 'sw-1', type: 'video', tracks: [unresolved] }] },
      ],
      startTime: 0,
    };
    const state = makeState({ presentation, selectedVideoTrackId: 'track-1' });

    // Wall clock at media-time 0, 20s before the first segment's PDT — so an
    // anchored first segment lands at startTime 20 and the track's startDate
    // reads back as the anchor. Without the stamp, the track would resolve at
    // local base 0 with startDate = the raw first-segment PDT instead.
    const ANCHOR = 1_672_531_200;
    const PLAYLIST = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="http://example.com/init.mp4"
#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:20.000Z
#EXTINF:4.0,
http://example.com/seg0.m4s`;

    // Gate the fetch so the stamp lands while the request is in flight.
    let releaseFetch!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      markStarted();
      await inFlight;
      return new Response(PLAYLIST);
    });

    const reactor = resolveVideoTrack.setup({ state });

    await started;
    // Establish + stamp the anchor mid-fetch, exactly as anchor-live-tracks does.
    state.presentation.set(positionAllTracksToAnchor(state.presentation.get() as Presentation, ANCHOR));
    releaseFetch();

    await vi.waitFor(() => {
      expect(isResolvedTrack(findTrackById(state.presentation.get()!, 'track-1')!)).toBe(true);
    });

    const resolved = findTrackById(state.presentation.get()!, 'track-1');
    expect(resolved.startDate).toBe(ANCHOR);

    reactor.destroy();
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
