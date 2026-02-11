import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackEngine } from '../playback-engine';

describe('createPlaybackEngine', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // Save original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });
  it('creates engine with state, owners, and events', () => {
    const engine = createPlaybackEngine();

    expect(engine.state).toBeDefined();
    expect(engine.owners).toBeDefined();
    expect(engine.events).toBeDefined();
    expect(engine.destroy).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('initializes with empty state and owners', () => {
    const engine = createPlaybackEngine();

    expect(engine.state.current).toEqual({});
    expect(engine.owners.current).toEqual({});

    engine.destroy();
  });

  it('allows patching state and owners from outside', async () => {
    const engine = createPlaybackEngine();

    const mediaElement = document.createElement('video');
    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'https://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    // Wait for microtask queue to drain (patches are batched)
    await new Promise((resolve) => queueMicrotask(resolve));

    expect(engine.owners.current.mediaElement).toBe(mediaElement);
    expect(engine.state.current.presentation?.url).toBe('https://example.com/playlist.m3u8');

    engine.destroy();
  });

  it('accepts custom configuration', () => {
    const engine = createPlaybackEngine({
      initialBandwidth: 3_000_000,
      preferredAudioLanguage: 'es',
    });

    // Engine should be created successfully with config
    expect(engine.state).toBeDefined();

    engine.destroy();
  });

  it('cleans up all orchestrations on destroy', () => {
    const engine = createPlaybackEngine();

    // Should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('can be destroyed multiple times safely', () => {
    const engine = createPlaybackEngine();

    engine.destroy();

    // Second destroy should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('resolves presentation when URL and preload are patched', async () => {
    // Mock fetch with URL-based lookup for different playlist types
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      // Multivariant playlist
      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      // Video media playlist
      if (url.includes('video-360p.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init.mp4"
#EXTINF:10.0,
http://example.com/segment1.m4s
#EXT-X-ENDLIST`)
        );
      }

      // Fallback for unmocked URLs
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();

    // Patch state to trigger presentation resolution
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    // Wait for presentation to be resolved (no event needed - state-driven)
    await vi.waitFor(
      () => {
        const { presentation } = engine.state.current;
        expect(presentation?.selectionSets).toBeDefined();
        expect(presentation?.selectionSets?.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    // Verify fetch was called
    expect(mockFetch).toHaveBeenCalled();

    engine.destroy();
  });

  it('orchestrates complete pipeline: presentation → tracks → MediaSource → SourceBuffers', async () => {
    // Mock fetch with URL-based lookup for all playlist types
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      // Multivariant playlist with video and audio
      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHANNELS="2",URI="http://example.com/audio-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E,mp4a.40.2",AUDIO="audio",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      // Video media playlist
      if (url.includes('video-360p.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-video.mp4"
#EXTINF:10.0,
http://example.com/video-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      // Audio media playlist
      if (url.includes('audio-en.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-audio.mp4"
#EXTINF:10.0,
http://example.com/audio-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();
    const mediaElement = document.createElement('video');

    // Initialize: patch owners and state
    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    // Wait for complete orchestration pipeline
    await vi.waitFor(
      () => {
        const state = engine.state.current;
        const owners = engine.owners.current;

        // === IMMUTABLE STATE VERIFICATION ===

        // 1. Presentation should be fully resolved
        expect(state.presentation).toBeDefined();
        expect(state.presentation?.id).toBeDefined();
        expect(state.presentation?.selectionSets).toBeDefined();
        expect(state.presentation?.selectionSets?.length).toBeGreaterThan(0);

        // 2. Video track should be selected and resolved
        expect(state.selectedVideoTrackId).toBeDefined();
        const videoTrack = state.presentation?.selectionSets
          ?.find((s: any) => s.type === 'video')
          ?.switchingSets?.[0]?.tracks?.find((t: any) => t.id === state.selectedVideoTrackId);
        expect(videoTrack).toBeDefined();
        expect(videoTrack?.segments).toBeDefined(); // Track resolved (has segments)

        // 3. Audio track should be selected and resolved
        expect(state.selectedAudioTrackId).toBeDefined();
        const audioTrack = state.presentation?.selectionSets
          ?.find((s: any) => s.type === 'audio')
          ?.switchingSets?.[0]?.tracks?.find((t: any) => t.id === state.selectedAudioTrackId);
        expect(audioTrack).toBeDefined();
        expect(audioTrack?.segments).toBeDefined(); // Track resolved (has segments)

        // === MUTABLE OWNERS VERIFICATION ===

        // 4. MediaElement should be set
        expect(owners.mediaElement).toBe(mediaElement);

        // 5. MediaSource should be created and open
        expect(owners.mediaSource).toBeDefined();
        expect(owners.mediaSource?.readyState).toBe('open');

        // 6. Video SourceBuffer should be created
        expect(owners.videoBuffer).toBeDefined();
        expect(owners.videoBuffer).toBeInstanceOf(SourceBuffer);

        // 7. Audio SourceBuffer should be created
        expect(owners.audioBuffer).toBeDefined();
        expect(owners.audioBuffer).toBeInstanceOf(SourceBuffer);
      },
      { timeout: 5000 }
    );

    engine.destroy();
  });

  it('handles video-only stream (no audio tracks)', async () => {
    // Mock fetch for video-only stream
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      if (url.includes('video-360p.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-video.mp4"
#EXTINF:10.0,
http://example.com/video-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();
    const mediaElement = document.createElement('video');

    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    await vi.waitFor(
      () => {
        const state = engine.state.current;
        const owners = engine.owners.current;

        // Should create video track and buffer
        expect(state.selectedVideoTrackId).toBeDefined();
        expect(owners.videoBuffer).toBeDefined();

        // Should NOT create audio track or buffer
        expect(state.selectedAudioTrackId).toBeUndefined();
        expect(owners.audioBuffer).toBeUndefined();

        // MediaSource should still be created
        expect(owners.mediaSource).toBeDefined();
        expect(owners.mediaSource?.readyState).toBe('open');
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });

  it.skip('handles audio-only stream (no video tracks)', async () => {
    // TODO: Need proper audio-only HLS manifest structure
    // Current STREAM-INF approach creates video track
    // Mock fetch for audio-only stream
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",LANGUAGE="en",CHANNELS="2",URI="http://example.com/audio-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2",AUDIO="audio"
http://example.com/audio-en.m3u8`)
        );
      }

      if (url.includes('audio-en.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-audio.mp4"
#EXTINF:10.0,
http://example.com/audio-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();
    const mediaElement = document.createElement('video');

    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    await vi.waitFor(
      () => {
        const state = engine.state.current;
        const owners = engine.owners.current;

        // Should create audio track and buffer
        expect(state.selectedAudioTrackId).toBeDefined();
        expect(owners.audioBuffer).toBeDefined();

        // Should NOT create video track or buffer
        expect(state.selectedVideoTrackId).toBeUndefined();
        expect(owners.videoBuffer).toBeUndefined();

        // MediaSource should still be created
        expect(owners.mediaSource).toBeDefined();
        expect(owners.mediaSource?.readyState).toBe('open');
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });

  it('does not auto-select text tracks (user opt-in)', async () => {
    // Mock fetch for stream with text tracks
    const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      if (url.includes('playlist.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",LANGUAGE="en",URI="http://example.com/text-en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000000,CODECS="avc1.42E01E",SUBTITLES="subs",RESOLUTION=640x360
http://example.com/video-360p.m3u8`)
        );
      }

      if (url.includes('video-360p.m3u8')) {
        return Promise.resolve(
          new Response(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="http://example.com/init-video.mp4"
#EXTINF:10.0,
http://example.com/video-seg1.m4s
#EXT-X-ENDLIST`)
        );
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    globalThis.fetch = mockFetch;

    const engine = createPlaybackEngine();
    const mediaElement = document.createElement('video');

    engine.owners.patch({ mediaElement });
    engine.state.patch({
      presentation: { url: 'http://example.com/playlist.m3u8' },
      preload: 'auto',
    });

    await vi.waitFor(
      () => {
        const state = engine.state.current;

        // Should have resolved presentation with text tracks
        expect(state.presentation?.selectionSets).toBeDefined();
        const textSet = state.presentation?.selectionSets?.find((s: any) => s.type === 'text');
        expect(textSet).toBeDefined();

        // Should NOT auto-select text track (user opt-in)
        expect(state.selectedTextTrackId).toBeUndefined();
      },
      { timeout: 2000 }
    );

    engine.destroy();
  });
});
