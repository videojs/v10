import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import { buildMimeCodec } from '../../../../media/dom/mse/mediasource-setup';
import type { AudioTrack, MaybeResolvedPresentation, Presentation, VideoTrack } from '../../../../media/types';
import type { BandwidthState } from '../../../../network/bandwidth-estimator';
import type { SegmentLoaderActor } from '../../../actors/dom/segment-loader';
import type { SourceBufferActor } from '../../../actors/dom/source-buffer';
import {
  type BufferActorsContext,
  type BufferActorsState,
  setupAudioBufferActors,
  setupVideoBufferActors,
} from '../setup-buffer-actors';

// Mock `createSourceBuffer`; keep the real `buildMimeCodec` so its tests
// exercise the actual implementation.
vi.mock('../../../../media/dom/mse/mediasource-setup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../media/dom/mse/mediasource-setup')>();
  return {
    ...actual,
    createSourceBuffer: vi.fn((_mediaSource: MediaSource, mimeCodec: string) => ({
      mimeCodec,
      mode: 'segments',
      updating: false,
    })),
  };
});

// Mock `createSegmentLoaderActor` — the real implementation needs a working
// SourceBufferActor + fetch loop which we don't exercise here. The test
// verifies the call shape and slot publication, not actor internals.
vi.mock('../../../actors/dom/segment-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../actors/dom/segment-loader')>();
  return {
    ...actual,
    createSegmentLoaderActor: vi.fn(
      (_sourceBufferActor: SourceBufferActor, _fetchBytes: unknown): SegmentLoaderActor =>
        ({ destroy: vi.fn() }) as unknown as SegmentLoaderActor
    ),
  };
});

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

function makeState(initial: BufferActorsState = {}): StateSignals<BufferActorsState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    bandwidthState: signal<BandwidthState | undefined>(initial.bandwidthState),
  };
}

function makeContext(initial: BufferActorsContext = {}): ContextSignals<BufferActorsContext> {
  return {
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
    videoBufferActor: signal<SourceBufferActor | undefined>(initial.videoBufferActor),
    audioBufferActor: signal<SourceBufferActor | undefined>(initial.audioBufferActor),
    videoSegmentLoaderActor: signal<SegmentLoaderActor | undefined>(initial.videoSegmentLoaderActor),
    audioSegmentLoaderActor: signal<SegmentLoaderActor | undefined>(initial.audioSegmentLoaderActor),
  };
}

// Compose both per-type variants in the same registration order as the
// engine (video first, audio second) — the Firefox `mozHasAudio` invariant
// classification relies on that order.
function setupSetupBufferActors(initialState: BufferActorsState = {}, initialContext: BufferActorsContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const videoReactor = setupVideoBufferActors.setup({
    state,
    context: {
      mediaSource: context.mediaSource,
      videoBufferActor: context.videoBufferActor,
      videoSegmentLoaderActor: context.videoSegmentLoaderActor,
    },
  });
  const audioReactor = setupAudioBufferActors.setup({
    state,
    context: {
      mediaSource: context.mediaSource,
      audioBufferActor: context.audioBufferActor,
      audioSegmentLoaderActor: context.audioSegmentLoaderActor,
    },
  });
  const cleanup = () => {
    videoReactor.destroy();
    audioReactor.destroy();
  };
  return { state, context, cleanup };
}

describe('setupVideoBufferActors + setupAudioBufferActors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates video buffer + loader actors for video-only source', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack = createResolvedVideoTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(createSegmentLoaderActor).toHaveBeenCalledTimes(1);
      expect(context.videoBufferActor.get()).toBeDefined();
      expect(context.videoSegmentLoaderActor.get()).toBeDefined();
      expect(context.audioBufferActor.get()).toBeUndefined();
      expect(context.audioSegmentLoaderActor.get()).toBeUndefined();
    });

    cleanup();
  });

  it('creates audio buffer + loader actors for audio-only source', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const audioTrack = createResolvedAudioTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ audio: audioTrack }));
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(createSegmentLoaderActor).toHaveBeenCalledTimes(1);
      expect(context.audioBufferActor.get()).toBeDefined();
      expect(context.audioSegmentLoaderActor.get()).toBeDefined();
      expect(context.videoBufferActor.get()).toBeUndefined();
      expect(context.videoSegmentLoaderActor.get()).toBeUndefined();
    });

    cleanup();
  });

  it('creates both clusters together when both tracks are selected', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack = createResolvedVideoTrack();
    const audioTrack = createResolvedAudioTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack, audio: audioTrack }));
    state.selectedVideoTrackId.set('video-1');
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(2);
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'video/mp4; codecs="avc1.42E01E"');
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(createSegmentLoaderActor).toHaveBeenCalledTimes(2);
      expect(context.videoBufferActor.get()).toBeDefined();
      expect(context.videoSegmentLoaderActor.get()).toBeDefined();
      expect(context.audioBufferActor.get()).toBeDefined();
      expect(context.audioSegmentLoaderActor.get()).toBeDefined();
    });

    cleanup();
  });

  it('creates each cluster independently as its own type selection lands', async () => {
    // Per-type variants gate only on their own type — video doesn't wait
    // for audio selection. Selection + codecs (available from the
    // multivariant playlist) is enough.
    const videoTrack = createResolvedVideoTrack();
    const audioTrack = createResolvedAudioTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    context.mediaSource.set({} as MediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack, audio: audioTrack }));

    // Video selection lands first; audio selection has not landed yet.
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(context.videoBufferActor.get()).toBeDefined();
      expect(context.videoSegmentLoaderActor.get()).toBeDefined();
      expect(context.audioBufferActor.get()).toBeUndefined();
      expect(context.audioSegmentLoaderActor.get()).toBeUndefined();
    });

    // Audio selection lands later — audio cluster creates independently.
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(context.audioBufferActor.get()).toBeDefined();
      expect(context.audioSegmentLoaderActor.get()).toBeDefined();
    });

    cleanup();
  });

  it('creates cluster from partial resolution (no segments yet)', async () => {
    // Clusters must create on partial resolution — codecs from the
    // multivariant playlist are sufficient; per-type media playlist
    // resolution (segments) is not required.
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');

    const resolvedAudio = createResolvedAudioTrack();
    const { segments: _s, initialization: _i, startTime: _st, duration: _d, ...partiallyResolvedAudio } = resolvedAudio;

    const { state, context, cleanup } = setupSetupBufferActors();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ audio: partiallyResolvedAudio as AudioTrack }));
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledWith(mediaSource, 'audio/mp4; codecs="mp4a.40.2"');
      expect(context.audioBufferActor.get()).toBeDefined();
      expect(context.audioSegmentLoaderActor.get()).toBeDefined();
    });

    cleanup();
  });

  it('does not create cluster when track has no codecs', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack: VideoTrack = { ...createResolvedVideoTrack(), codecs: [] };
    const { state, context, cleanup } = setupSetupBufferActors();

    context.mediaSource.set({} as MediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();
    expect(createSegmentLoaderActor).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create cluster more than once', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack = createResolvedVideoTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    context.mediaSource.set({} as MediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(createSourceBuffer).toHaveBeenCalledTimes(1);
      expect(createSegmentLoaderActor).toHaveBeenCalledTimes(1);
    });

    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).toHaveBeenCalledTimes(1);
    expect(createSegmentLoaderActor).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('does not create without a MediaSource', async () => {
    const { createSourceBuffer } = await import('../../../../media/dom/mse/mediasource-setup');
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack = createResolvedVideoTrack();
    const { state, cleanup } = setupSetupBufferActors();

    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createSourceBuffer).not.toHaveBeenCalled();
    expect(createSegmentLoaderActor).not.toHaveBeenCalled();

    cleanup();
  });

  it('destroys loader before buffer-actor on state exit', async () => {
    const { createSegmentLoaderActor } = await import('../../../actors/dom/segment-loader');

    const videoTrack = createResolvedVideoTrack();
    const { state, context, cleanup } = setupSetupBufferActors();

    const mediaSource = {} as MediaSource;
    context.mediaSource.set(mediaSource);
    state.presentation.set(createPresentationWithTracks({ video: videoTrack }));
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(context.videoBufferActor.get()).toBeDefined();
      expect(context.videoSegmentLoaderActor.get()).toBeDefined();
    });

    const loader = context.videoSegmentLoaderActor.get()!;
    const loaderDestroy = loader.destroy as ReturnType<typeof vi.fn>;
    expect(createSegmentLoaderActor).toHaveBeenCalledTimes(1);

    // Detach mediaSource → state machine transitions to 'preconditions-unmet'
    context.mediaSource.set(undefined);

    await vi.waitFor(() => {
      expect(loaderDestroy).toHaveBeenCalled();
      expect(context.videoBufferActor.get()).toBeUndefined();
      expect(context.videoSegmentLoaderActor.get()).toBeUndefined();
    });

    cleanup();
  });
});
