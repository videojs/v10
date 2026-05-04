import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { AudioTrack, Presentation, VideoTrack } from '../../../../media/types';
import type { SourceBufferActor } from '../../../actors/dom/source-buffer';
import {
  buildMimeCodec,
  type SourceBufferContext,
  type SourceBufferState,
  setupSourceBuffers,
} from '../setup-sourcebuffer';

// Mock the DOM utilities
vi.mock('../../../../media/dom/mse/mediasource-setup', () => ({
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

function makeState(initial: SourceBufferState = {}): StateSignals<SourceBufferState> {
  return {
    presentation: signal<Presentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
  };
}

function makeContext(initial: SourceBufferContext = {}): ContextSignals<SourceBufferContext> {
  return {
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
    videoBuffer: signal<SourceBuffer | undefined>(initial.videoBuffer),
    audioBuffer: signal<SourceBuffer | undefined>(initial.audioBuffer),
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
  };
}

function setupSetupSourceBuffers(initialState: SourceBufferState = {}, initialContext: SourceBufferContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const cleanup = setupSourceBuffers.setup({ state, context });
  return { state, context, cleanup };
}

describe('setupSourceBuffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates video SourceBuffer for video-only source', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const { state, context, cleanup } = setupSetupSourceBuffers();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(context.videoBuffer.get()).toBeDefined();
      expect(context.audioBuffer.get()).toBeUndefined();
    });

    cleanup();
  });

  it('creates audio SourceBuffer for audio-only source', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const audioTrack = createResolvedAudioTrack();
    const { state, context, cleanup } = setupSetupSourceBuffers();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ audio: audioTrack }));
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(context.audioBuffer.get()).toBeDefined();
      expect(context.videoBuffer.get()).toBeUndefined();
    });

    cleanup();
  });

  it('creates both SourceBuffers together when both tracks are selected', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const audioTrack = createResolvedAudioTrack();
    const { state, context, cleanup } = setupSetupSourceBuffers();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack, audio: audioTrack }));
    state.selectedVideoTrackId.set('video-1');
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(2);
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(context.videoBuffer.get()).toBeDefined();
      expect(context.audioBuffer.get()).toBeDefined();
    });

    cleanup();
  });

  it('waits for audio to resolve before creating video SourceBuffer when both are selected', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

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

    const { state, context, cleanup } = setupSetupSourceBuffers();

    context.mediaSource.set({} as MediaSource);
    // Both track IDs selected, but audio track is not yet resolved
    state.presentation.set(
      createPresentationWithTracks({
        video: videoTrack,
        audio: unresolvedAudioPartial as AudioTrack,
      })
    );
    state.selectedVideoTrackId.set('video-1');
    state.selectedAudioTrackId.set('audio-1');

    // Video is resolved but audio is not — neither SourceBuffer should be created yet
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    // Now audio resolves
    state.presentation.set(createPresentationWithTracks({ video: videoTrack, audio: unresolvedAudio }));

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(2);
      expect(context.videoBuffer.get()).toBeDefined();
      expect(context.audioBuffer.get()).toBeDefined();
    });

    cleanup();
  });

  it('does not create SourceBuffer when track has no codecs', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const videoTrack: VideoTrack = { ...createResolvedVideoTrack(), codecs: [] };
    const { state, context, cleanup } = setupSetupSourceBuffers();

    context.mediaSource.set({} as MediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create SourceBuffers more than once', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const { state, context, cleanup } = setupSetupSourceBuffers();

    context.mediaSource.set({} as MediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => expect(createSourceBuffer).toHaveBeenCalledTimes(1));

    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not create without a MediaSource', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const videoTrack = createResolvedVideoTrack();
    const { state, cleanup } = setupSetupSourceBuffers();

    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();

    cleanup();
  });
});
