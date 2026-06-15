import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type PartiallyResolvedAudioTrack,
  type PartiallyResolvedVideoTrack,
  type Presentation,
} from '../../../media/types';
import { findTrack } from '../../../media/utils/tracks';
import { reloadAudioTrack, reloadVideoTrack } from '../reload-track';

afterEach(() => {
  vi.restoreAllMocks();
});

const MEDIA_PLAYLIST = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="init.mp4"
#EXTINF:4.0,
seg0.m4s
#EXT-X-ENDLIST`;

const unresolvedVideo: PartiallyResolvedVideoTrack = {
  type: 'video',
  id: 'v-1',
  url: 'https://example.com/video.m3u8',
  bandwidth: 1_000_000,
  mimeType: 'video/mp4',
  codecs: [],
};

const unresolvedAudio: PartiallyResolvedAudioTrack = {
  type: 'audio',
  id: 'a-1',
  url: 'https://example.com/audio.m3u8',
  groupId: 'aud',
  name: 'Default',
  language: 'und',
  codecs: ['mp4a.40.2'],
  mimeType: 'audio/mp4',
  bandwidth: 0,
  sampleRate: 48000,
  channels: 2,
};

function makePresentation(): Presentation {
  return {
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [
      { id: 'video-set', type: 'video', switchingSets: [{ id: 'vs', type: 'video', tracks: [unresolvedVideo] }] },
      { id: 'audio-set', type: 'audio', switchingSets: [{ id: 'as', type: 'audio', tracks: [unresolvedAudio] }] },
    ],
  };
}

const fakeFetch = () =>
  vi.fn((_addressable: { url: string }, _options?: { signal?: AbortSignal }) => Promise.resolve(MEDIA_PLAYLIST));

describe('reloadVideoTrack', () => {
  it('resolves the selected video track and fetches *its* playlist (not audio)', async () => {
    const presentation = makePresentation();
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
      selectedVideoTrackId: signal<string | undefined>('v-1'),
    };
    const fetchResolvableText = fakeFetch();

    const reactor = reloadVideoTrack.setup({ state, config: { fetchResolvableText } });

    await vi.waitFor(() => {
      const track = findTrack(state.presentation.get()!, 'video', 'v-1');
      expect(track && isResolvedTrack(track)).toBe(true);
    });

    // Fetched the video playlist; the audio track is left untouched.
    expect(fetchResolvableText.mock.calls[0]?.[0]?.url).toContain('video.m3u8');
    const audio = findTrack(state.presentation.get()!, 'audio', 'a-1');
    expect(audio && isResolvedTrack(audio)).toBe(false);

    reactor.destroy();
  });

  it('stays idle with no selected track', () => {
    const fetchResolvableText = fakeFetch();
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation()),
      selectedVideoTrackId: signal<string | undefined>(undefined),
    };
    const reactor = reloadVideoTrack.setup({ state, config: { fetchResolvableText } });
    expect(fetchResolvableText).not.toHaveBeenCalled();
    reactor.destroy();
  });
});

describe('reloadAudioTrack', () => {
  it('resolves the selected audio track and fetches *its* playlist (not video)', async () => {
    const presentation = makePresentation();
    const state = {
      presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
      selectedAudioTrackId: signal<string | undefined>('a-1'),
    };
    const fetchResolvableText = fakeFetch();

    const reactor = reloadAudioTrack.setup({ state, config: { fetchResolvableText } });

    await vi.waitFor(() => {
      const track = findTrack(state.presentation.get()!, 'audio', 'a-1');
      expect(track && isResolvedTrack(track)).toBe(true);
    });

    expect(fetchResolvableText.mock.calls[0]?.[0]?.url).toContain('audio.m3u8');
    const video = findTrack(state.presentation.get()!, 'video', 'v-1');
    expect(video && isResolvedTrack(video)).toBe(false);

    reactor.destroy();
  });
});

describe('reload resilience', () => {
  it('survives a transient fetch failure and retries (does not kill the loop)', async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const state = {
        presentation: signal<MaybeResolvedPresentation | undefined>(makePresentation()),
        selectedVideoTrackId: signal<string | undefined>('v-1'),
      };
      let calls = 0;
      const fetchResolvableText = vi.fn(() => {
        calls += 1;
        return calls === 1 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve(MEDIA_PLAYLIST);
      });

      const reactor = reloadVideoTrack.setup({ state, config: { fetchResolvableText } });

      // First attempt rejects: logged, but the loop is still alive (track not yet resolved).
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
      expect(isResolvedTrack(findTrack(state.presentation.get()!, 'video', 'v-1')!)).toBe(false);

      // Retry cadence elapses → second attempt succeeds (would never happen if the
      // loop had died on the first failure).
      await vi.advanceTimersByTimeAsync(6000);
      expect(calls).toBe(2);
      expect(isResolvedTrack(findTrack(state.presentation.get()!, 'video', 'v-1')!)).toBe(true);

      reactor.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
