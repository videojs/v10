import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { TrackSelectionState } from '../../../media/primitives/select-tracks';
import type {
  AudioSelectionSet,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  TextSelectionSet,
  VideoSelectionSet,
} from '../../../media/types';
import { selectMediaTrack, selectTextTrack } from '../select-tracks';

function makeState(initial: TrackSelectionState = {}): StateSignals<TrackSelectionState> {
  return {
    presentation: signal<Presentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    selectedTextTrackId: signal<string | undefined>(initial.selectedTextTrackId),
  };
}

// Helper to create a minimal presentation
function createPresentation(config: {
  video?: PartiallyResolvedVideoTrack[];
  audio?: PartiallyResolvedAudioTrack[];
  text?: any[];
}): Presentation {
  const selectionSets = [];

  if (config.video && config.video.length > 0) {
    selectionSets.push({
      id: 'video-set',
      type: 'video' as const,
      switchingSets: [
        {
          id: 'video-switching',
          type: 'video' as const,
          tracks: config.video,
        },
      ],
    } as VideoSelectionSet);
  }

  if (config.audio && config.audio.length > 0) {
    selectionSets.push({
      id: 'audio-set',
      type: 'audio' as const,
      switchingSets: [
        {
          id: 'audio-switching',
          type: 'audio' as const,
          tracks: config.audio,
        },
      ],
    } as AudioSelectionSet);
  }

  if (config.text && config.text.length > 0) {
    selectionSets.push({
      id: 'text-set',
      type: 'text' as const,
      switchingSets: [
        {
          id: 'text-switching',
          type: 'text' as const,
          tracks: config.text,
        },
      ],
    } as TextSelectionSet);
  }

  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets,
    startTime: 0,
  };
}

describe('selectMediaTrack — video', () => {
  it('selects video track when presentation loaded', async () => {
    const videoTracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'video-360p',
        url: 'http://example.com/360p.m3u8',
        bandwidth: 500_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
    ];

    const presentation = createPresentation({ video: videoTracks });
    const state = makeState({ presentation });

    const cleanup = selectMediaTrack({ state }, { type: 'video' });

    // Wait for selection
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBe('video-360p');

    cleanup();
  });

  it('does not select when video track already selected', async () => {
    const presentation = createPresentation({ video: [] });
    const state = makeState({ presentation, selectedVideoTrackId: 'existing-video' });

    const cleanup = selectMediaTrack({ state }, { type: 'video' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBe('existing-video');

    cleanup();
  });

  it.skip('uses bandwidth configuration for initial selection', async () => {
    const videoTracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'video-360p',
        url: 'http://example.com/360p.m3u8',
        bandwidth: 500_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
      {
        type: 'video',
        id: 'video-720p',
        url: 'http://example.com/720p.m3u8',
        bandwidth: 2_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
    ];

    const presentation = createPresentation({ video: videoTracks });
    const state = makeState({ presentation });

    const cleanup = selectMediaTrack({ state }, { initialBandwidth: 3_000_000, type: 'video' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedVideoTrackId.get()).toBe('video-720p');

    cleanup();
  });
});

describe('selectMediaTrack — audio', () => {
  it('selects audio track when presentation loaded', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const cleanup = selectMediaTrack({ state }, { type: 'audio' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    cleanup();
  });

  it('does not select when audio track already selected', async () => {
    const presentation = createPresentation({ audio: [] });
    const state = makeState({ presentation, selectedAudioTrackId: 'existing-audio' });

    const cleanup = selectMediaTrack({ state }, { type: 'audio' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('existing-audio');

    cleanup();
  });

  it.skip('uses preferred language configuration', async () => {
    const audioTracks: PartiallyResolvedAudioTrack[] = [
      {
        type: 'audio',
        id: 'audio-en',
        url: 'http://example.com/audio-en.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'English',
        language: 'en',
        sampleRate: 48000,
        channels: 2,
      },
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        language: 'es',
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: audioTracks });
    const state = makeState({ presentation });

    const cleanup = selectMediaTrack({ state }, { type: 'audio', preferredAudioLanguage: 'es' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    cleanup();
  });
});

describe('selectTextTrack', () => {
  it('does not auto-select text track', async () => {
    const textTracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
      },
    ];

    const presentation = createPresentation({ text: textTracks });
    const state = makeState({ presentation });

    const cleanup = selectTextTrack({ state }, { type: 'text' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedTextTrackId.get()).toBeUndefined();

    cleanup();
  });
});
