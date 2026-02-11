import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../state/create-state';
import type { AudioTrack, Presentation, VideoTrack } from '../../types';
import {
  buildMimeCodec,
  canSetupBuffer,
  type SourceBufferOwners,
  type SourceBufferState,
  setupSourceBuffer,
  shouldSetupBuffer,
} from '../setup-sourcebuffer';

// Mock the DOM utilities
vi.mock('../../../dom/media/mediasource-setup', () => ({
  createSourceBuffer: vi.fn((_mediaSource: MediaSource, mimeCodec: string) => ({
    mimeCodec,
    mode: 'segments',
    updating: false,
  })),
}));

// Helper to create a resolved video track
function createResolvedVideoTrack(id = 'video-1'): VideoTrack {
  return {
    type: 'video',
    id,
    url: 'http://example.com/video.m3u8',
    bandwidth: 1000000,
    mimeType: 'video/mp4',
    codecs: ['avc1.42E01E'],
    width: 1920,
    height: 1080,
    startTime: 0,
    duration: 10,
    initialization: { url: 'http://example.com/init.mp4' },
    segments: [
      {
        id: 'seg-1',
        url: 'http://example.com/seg1.m4s',
        startTime: 0,
        duration: 5,
      },
    ],
  };
}

// Helper to create a resolved audio track
function createResolvedAudioTrack(id = 'audio-1'): AudioTrack {
  return {
    type: 'audio',
    id,
    url: 'http://example.com/audio.m3u8',
    bandwidth: 128000,
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    groupId: 'audio-group',
    name: 'English',
    sampleRate: 48000,
    channels: 2,
    startTime: 0,
    duration: 10,
    initialization: { url: 'http://example.com/audio-init.mp4' },
    segments: [
      {
        id: 'seg-1',
        url: 'http://example.com/audio-seg1.m4s',
        startTime: 0,
        duration: 5,
      },
    ],
  };
}

// Helper to create presentation with tracks
function createPresentationWithTracks(tracks: { video?: VideoTrack; audio?: AudioTrack }): Presentation {
  const selectionSets = [];

  if (tracks.video) {
    selectionSets.push({
      id: 'video-set',
      type: 'video' as const,
      switchingSets: [
        {
          id: 'video-switching',
          type: 'video' as const,
          tracks: [tracks.video],
        },
      ],
    });
  }

  if (tracks.audio) {
    selectionSets.push({
      id: 'audio-set',
      type: 'audio' as const,
      switchingSets: [
        {
          id: 'audio-switching',
          type: 'audio' as const,
          tracks: [tracks.audio],
        },
      ],
    });
  }

  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets,
    startTime: 0,
  };
}

describe('buildMimeCodec', () => {
  it('constructs MIME codec string with single codec', () => {
    const track = createResolvedVideoTrack();
    const result = buildMimeCodec(track);
    expect(result).toBe('video/mp4; codecs="avc1.42E01E"');
  });

  it('constructs MIME codec string with multiple codecs', () => {
    const track: VideoTrack = {
      ...createResolvedVideoTrack(),
      codecs: ['avc1.42E01E', 'mp4a.40.2'],
    };
    const result = buildMimeCodec(track);
    expect(result).toBe('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
  });

  it('handles empty codecs array', () => {
    const track: VideoTrack = {
      ...createResolvedVideoTrack(),
      codecs: [],
    };
    const result = buildMimeCodec(track);
    expect(result).toBe('video/mp4; codecs=""');
  });
});

describe('canSetupBuffer', () => {
  it('returns true when MediaSource open and video track resolved with codecs', () => {
    const videoTrack = createResolvedVideoTrack();
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    };
    const owners: SourceBufferOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canSetupBuffer(state, owners, 'video')).toBe(true);
  });

  it('returns false when MediaSource is missing', () => {
    const videoTrack = createResolvedVideoTrack();
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    };
    const owners: SourceBufferOwners = {};

    expect(canSetupBuffer(state, owners, 'video')).toBe(false);
  });

  it('returns false when MediaSource not open', () => {
    const videoTrack = createResolvedVideoTrack();
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    };
    const owners: SourceBufferOwners = {
      mediaSource: { readyState: 'closed' } as MediaSource,
    };

    expect(canSetupBuffer(state, owners, 'video')).toBe(false);
  });

  it('returns false when track not selected', () => {
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({}),
    };
    const owners: SourceBufferOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canSetupBuffer(state, owners, 'video')).toBe(false);
  });

  it('returns true when track selected but not yet resolved', () => {
    const unresolvedTrack = {
      type: 'video' as const,
      id: 'video-1',
      url: 'http://example.com/video.m3u8',
      bandwidth: 1000000,
      mimeType: 'video/mp4',
      codecs: ['avc1.42E01E'],
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
              id: 'video-switching',
              type: 'video',
              tracks: [unresolvedTrack],
            },
          ],
        },
      ],
      startTime: 0,
    };
    const state: SourceBufferState = {
      presentation,
      selectedVideoTrackId: 'video-1',
    };
    const owners: SourceBufferOwners = {
      mediaSource: { readyState: 'open' } as MediaSource,
    };

    expect(canSetupBuffer(state, owners, 'video')).toBe(true);
  });
});

describe('shouldSetupBuffer', () => {
  it('returns true when video buffer does not exist', () => {
    const owners: SourceBufferOwners = {};
    expect(shouldSetupBuffer(owners, 'video')).toBe(true);
  });

  it('returns false when video buffer already exists', () => {
    const owners: SourceBufferOwners = {
      videoBuffer: {} as SourceBuffer,
    };
    expect(shouldSetupBuffer(owners, 'video')).toBe(false);
  });

  it('returns true when audio buffer does not exist', () => {
    const owners: SourceBufferOwners = {};
    expect(shouldSetupBuffer(owners, 'audio')).toBe(true);
  });

  it('returns false when audio buffer already exists', () => {
    const owners: SourceBufferOwners = {
      audioBuffer: {} as SourceBuffer,
    };
    expect(shouldSetupBuffer(owners, 'audio')).toBe(false);
  });
});

describe('setupSourceBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('video track', () => {
    it('creates SourceBuffer for resolved video track', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const videoTrack = createResolvedVideoTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      // Set up conditions
      const mediaSource = { readyState: 'open' } as MediaSource;
      owners.patch({ mediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
        selectedVideoTrackId: 'video-1',
      });

      // Wait for async operation
      await vi.waitFor(() => {
        expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      });

      cleanup();
    });

    it('updates owners with videoBuffer reference', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const mockBuffer = {
        mimeCodec: 'video/mp4; codecs="avc1.42E01E"',
        mode: 'segments',
        updating: false,
      };
      vi.mocked(createSourceBuffer).mockReturnValue(mockBuffer as unknown as SourceBuffer);

      const videoTrack = createResolvedVideoTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      owners.patch({ mediaSource: { readyState: 'open' } as MediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
        selectedVideoTrackId: 'video-1',
      });

      await vi.waitFor(() => {
        const currentOwners = owners.current;
        expect(currentOwners.videoBuffer).toBe(mockBuffer);
      });

      cleanup();
    });

    it('does not create if MediaSource not open', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const videoTrack = createResolvedVideoTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      owners.patch({ mediaSource: { readyState: 'closed' } as MediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
        selectedVideoTrackId: 'video-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createSourceBuffer).not.toHaveBeenCalled();

      cleanup();
    });

    it('does not create if track not resolved', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const unresolvedTrack = {
        type: 'video' as const,
        id: 'video-1',
        url: 'http://example.com/video.m3u8',
        bandwidth: 1000000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
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
                id: 'video-switching',
                type: 'video',
                tracks: [unresolvedTrack],
              },
            ],
          },
        ],
        startTime: 0,
      };

      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      owners.patch({ mediaSource: { readyState: 'open' } as MediaSource });
      state.patch({
        presentation,
        selectedVideoTrackId: 'video-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createSourceBuffer).not.toHaveBeenCalled();

      cleanup();
    });

    it('does not create if track missing codecs', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const videoTrack: VideoTrack = {
        ...createResolvedVideoTrack(),
        codecs: [],
      };

      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      owners.patch({ mediaSource: { readyState: 'open' } as MediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
        selectedVideoTrackId: 'video-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createSourceBuffer).not.toHaveBeenCalled();

      cleanup();
    });

    it('does not create multiple buffers (deduplication)', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const videoTrack = createResolvedVideoTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'video' });

      owners.patch({ mediaSource: { readyState: 'open' } as MediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
        selectedVideoTrackId: 'video-1',
      });

      await vi.waitFor(() => {
        expect(createSourceBuffer).toHaveBeenCalledTimes(1);
      });

      // Trigger another update
      state.patch({
        presentation: createPresentationWithTracks({ video: videoTrack }),
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(createSourceBuffer).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  describe('audio track', () => {
    it('creates SourceBuffer for resolved audio track', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const audioTrack = createResolvedAudioTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'audio' });

      const mediaSource = { readyState: 'open' } as MediaSource;
      owners.patch({ mediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ audio: audioTrack }),
        selectedAudioTrackId: 'audio-1',
      });

      await vi.waitFor(() => {
        expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      });

      cleanup();
    });

    it('updates owners with audioBuffer reference', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const mockBuffer = {
        mimeCodec: 'audio/mp4; codecs="mp4a.40.2"',
        mode: 'segments',
        updating: false,
      };
      vi.mocked(createSourceBuffer).mockReturnValue(mockBuffer as unknown as SourceBuffer);

      const audioTrack = createResolvedAudioTrack();
      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      const cleanup = setupSourceBuffer({ state, owners }, { type: 'audio' });

      owners.patch({ mediaSource: { readyState: 'open' } as MediaSource });
      state.patch({
        presentation: createPresentationWithTracks({ audio: audioTrack }),
        selectedAudioTrackId: 'audio-1',
      });

      await vi.waitFor(() => {
        const currentOwners = owners.current;
        expect(currentOwners.audioBuffer).toBe(mockBuffer);
      });

      cleanup();
    });
  });

  describe('multi-track orchestration', () => {
    it('creates video and audio track types in parallel', async () => {
      const { createSourceBuffer } = await import('../../../dom/media/mediasource-setup');

      const videoTrack = createResolvedVideoTrack();
      const audioTrack = createResolvedAudioTrack();

      const state = createState<SourceBufferState>({});
      const owners = createState<SourceBufferOwners>({});

      // Set up both orchestrations
      const videoCleanup = setupSourceBuffer({ state, owners }, { type: 'video' });
      const audioCleanup = setupSourceBuffer({ state, owners }, { type: 'audio' });

      // Set up conditions
      const mediaSource = { readyState: 'open' } as MediaSource;
      owners.patch({ mediaSource });
      state.patch({
        presentation: createPresentationWithTracks({
          video: videoTrack,
          audio: audioTrack,
        }),
        selectedVideoTrackId: 'video-1',
        selectedAudioTrackId: 'audio-1',
      });

      // Wait for both to be created
      await vi.waitFor(() => {
        expect(createSourceBuffer).toHaveBeenCalledTimes(2);
        expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
        expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      });

      // Verify both buffers are set
      const currentOwners = owners.current;
      expect(currentOwners.videoBuffer).toBeDefined();
      expect(currentOwners.audioBuffer).toBeDefined();

      videoCleanup();
      audioCleanup();
    });
  });
});
