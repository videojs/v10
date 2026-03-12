import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { AudioTrack, Presentation, VideoTrack } from '../../../core/types';
import {
  buildMimeCodec,
  canSetupBuffer,
  type SourceBufferOwners,
  type SourceBufferState,
  setupSourceBuffers,
  shouldSetupBuffer,
} from '../setup-sourcebuffer';

// Mock the DOM utilities
vi.mock('../../media/mediasource-setup', () => ({
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
  it('returns true when MediaSource exists and video track selected', () => {
    const videoTrack = createResolvedVideoTrack();
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    };
    const owners: SourceBufferOwners = {
      mediaSource: {} as MediaSource,
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

  it('returns false when track not selected', () => {
    const state: SourceBufferState = {
      presentation: createPresentationWithTracks({}),
    };
    const owners: SourceBufferOwners = {
      mediaSource: {} as MediaSource,
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
      mediaSource: {} as MediaSource,
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

describe('setupSourceBuffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates video SourceBuffer for video-only source', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    const mediaSource = {} as MediaSource;
    owners.patch({ mediaSource });
    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    });

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(owners.current.videoBuffer).toBeDefined();
      expect(owners.current.audioBuffer).toBeUndefined();
    });

    cleanup();
  });

  it('creates audio SourceBuffer for audio-only source', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const audioTrack = createResolvedAudioTrack();
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    const mediaSource = {} as MediaSource;
    owners.patch({ mediaSource });
    state.patch({
      presentation: createPresentationWithTracks({ audio: audioTrack }),
      selectedAudioTrackId: 'audio-1',
    });

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(owners.current.audioBuffer).toBeDefined();
      expect(owners.current.videoBuffer).toBeUndefined();
    });

    cleanup();
  });

  it('creates both SourceBuffers together when both tracks are selected', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const audioTrack = createResolvedAudioTrack();
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    const mediaSource = {} as MediaSource;
    owners.patch({ mediaSource });
    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack, audio: audioTrack }),
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
    });

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(2);
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(owners.current.videoBuffer).toBeDefined();
      expect(owners.current.audioBuffer).toBeDefined();
    });

    cleanup();
  });

  it('waits for audio to resolve before creating video SourceBuffer when both are selected', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const unresolvedAudio = createResolvedAudioTrack();
    // Simulate unresolved audio track (no segments/initialization — not a ResolvedTrack)
    const {
      segments: _s,
      initialization: _i,
      startTime: _st,
      duration: _d,
      ...unresolvedAudioPartial
    } = unresolvedAudio;

    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    owners.patch({ mediaSource: {} as MediaSource });
    // Both track IDs selected, but audio track is not yet resolved
    state.patch({
      presentation: createPresentationWithTracks({
        video: videoTrack,
        audio: unresolvedAudioPartial as AudioTrack,
      }),
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
    });

    // Video is resolved but audio is not — neither SourceBuffer should be created yet
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    // Now audio resolves
    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack, audio: unresolvedAudio }),
    });

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(2);
      expect(owners.current.videoBuffer).toBeDefined();
      expect(owners.current.audioBuffer).toBeDefined();
    });

    cleanup();
  });

  it('does not create SourceBuffer when track has no codecs', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack: VideoTrack = { ...createResolvedVideoTrack(), codecs: [] };
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    owners.patch({ mediaSource: {} as MediaSource });
    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create SourceBuffers more than once', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    owners.patch({ mediaSource: {} as MediaSource });
    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    });

    await vi.waitFor(() => expect(createSourceBuffer).toHaveBeenCalledTimes(1));

    state.patch({ presentation: createPresentationWithTracks({ video: videoTrack }) });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not create without a MediaSource', async () => {
    const { createSourceBuffer } = await import('../../media/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const state = createState<SourceBufferState>({});
    const owners = createState<SourceBufferOwners>({});
    const cleanup = setupSourceBuffers({ state, owners });

    state.patch({
      presentation: createPresentationWithTracks({ video: videoTrack }),
      selectedVideoTrackId: 'video-1',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    cleanup();
  });
});
