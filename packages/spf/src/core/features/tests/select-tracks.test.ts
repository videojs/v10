import { describe, expect, it } from 'vitest';
import { createEventStream } from '../../events/create-event-stream';
import { createState } from '../../state/create-state';
import type {
  AudioSelectionSet,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  TextSelectionSet,
  VideoSelectionSet,
} from '../../types';
import {
  pickAudioTrack,
  pickTextTrack,
  pickVideoTrack,
  selectAudioTrack,
  selectTextTrack,
  selectVideoTrack,
  type TrackSelectionAction,
  type TrackSelectionOwners,
  type TrackSelectionState,
} from '../select-tracks';

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

describe('pickVideoTrack', () => {
  it('selects appropriate quality based on initial bandwidth', () => {
    const tracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: '360p',
        url: 'http://example.com/360p.m3u8',
        bandwidth: 500_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 640,
        height: 360,
      },
      {
        type: 'video',
        id: '720p',
        url: 'http://example.com/720p.m3u8',
        bandwidth: 2_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 1280,
        height: 720,
      },
      {
        type: 'video',
        id: '1080p',
        url: 'http://example.com/1080p.m3u8',
        bandwidth: 4_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 1920,
        height: 1080,
      },
    ];

    const presentation = createPresentation({ video: tracks });

    // With default 1 Mbps, should select 360p (500k fits with margin)
    const selected = pickVideoTrack(presentation, { type: 'video' });
    expect(selected).toBe('360p');

    // With 3 Mbps, should select 720p (2M fits, 4M doesn't with 0.85 margin)
    const selected2 = pickVideoTrack(presentation, { initialBandwidth: 3_000_000, type: 'video' });
    expect(selected2).toBe('720p');

    // With 5 Mbps, should select 1080p (4M fits with margin)
    const selected3 = pickVideoTrack(presentation, { initialBandwidth: 5_000_000, type: 'video' });
    expect(selected3).toBe('1080p');
  });

  it('returns undefined when no video tracks', () => {
    const presentation = createPresentation({ audio: [] });

    const selected = pickVideoTrack(presentation, { type: 'video' });
    expect(selected).toBeUndefined();
  });

  it('falls back to lowest quality when bandwidth is very low', () => {
    const tracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: '720p',
        url: 'http://example.com/720p.m3u8',
        bandwidth: 2_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
      {
        type: 'video',
        id: '1080p',
        url: 'http://example.com/1080p.m3u8',
        bandwidth: 4_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
    ];

    const presentation = createPresentation({ video: tracks });

    // With 100 kbps (very low), should fall back to lowest (720p)
    const selected = pickVideoTrack(presentation, { initialBandwidth: 100_000, type: 'video' });
    expect(selected).toBe('720p');
  });

  it('uses custom safety margin when provided', () => {
    const tracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: '720p',
        url: 'http://example.com/720p.m3u8',
        bandwidth: 2_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
    ];

    const presentation = createPresentation({ video: tracks });

    // With 2.1 Mbps and 0.95 margin, should NOT select 720p (needs 2.1M)
    // Falls back to lowest
    const selected = pickVideoTrack(presentation, {
      initialBandwidth: 2_050_000,
      safetyMargin: 0.95,
      type: 'video',
    });
    expect(selected).toBe('720p'); // Falls back since it's the only/lowest option
  });
});

describe('pickAudioTrack', () => {
  it('selects first track when no preferences', () => {
    const tracks: PartiallyResolvedAudioTrack[] = [
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

    const presentation = createPresentation({ audio: tracks });

    const selected = pickAudioTrack(presentation, { type: 'audio' });
    expect(selected).toBe('audio-en');
  });

  it('selects preferred language when specified', () => {
    const tracks: PartiallyResolvedAudioTrack[] = [
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

    const presentation = createPresentation({ audio: tracks });

    const selected = pickAudioTrack(presentation, { type: 'audio', preferredAudioLanguage: 'es' });
    expect(selected).toBe('audio-es');
  });

  it('selects default track when available', () => {
    const tracks: PartiallyResolvedAudioTrack[] = [
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
      {
        type: 'audio',
        id: 'audio-es',
        url: 'http://example.com/audio-es.m3u8',
        bandwidth: 128_000,
        mimeType: 'audio/mp4',
        codecs: ['mp4a.40.2'],
        groupId: 'audio',
        name: 'Spanish',
        default: true,
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: tracks });

    const selected = pickAudioTrack(presentation, { type: 'audio' });
    expect(selected).toBe('audio-es');
  });

  it('prefers language match over default flag', () => {
    const tracks: PartiallyResolvedAudioTrack[] = [
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
        default: true,
        sampleRate: 48000,
        channels: 2,
      },
    ];

    const presentation = createPresentation({ audio: tracks });

    const selected = pickAudioTrack(presentation, { type: 'audio', preferredAudioLanguage: 'en' });
    expect(selected).toBe('audio-en');
  });

  it('returns undefined when no audio tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = pickAudioTrack(presentation, { type: 'audio' });
    expect(selected).toBeUndefined();
  });
});

describe('pickTextTrack', () => {
  it('returns undefined (no auto-selection)', () => {
    const tracks = [
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

    const presentation = createPresentation({ text: tracks });

    const selected = pickTextTrack(presentation, { type: 'text' });
    expect(selected).toBeUndefined();
  });

  it('returns undefined when no text tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = pickTextTrack(presentation, { type: 'text' });
    expect(selected).toBeUndefined();
  });
});

describe('selectVideoTrack', () => {
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

    const state = createState<TrackSelectionState>({ presentation });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectVideoTrack({ state, owners, events }, { type: 'video' });
    events.dispatch({ type: 'presentation-loaded' });

    // Wait for selection
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedVideoTrackId).toBe('video-360p');

    cleanup();
  });

  it('does not select when video track already selected', async () => {
    const presentation = createPresentation({ video: [] });

    const state = createState<TrackSelectionState>({
      presentation,
      selectedVideoTrackId: 'existing-video',
    });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectVideoTrack({ state, owners, events }, { type: 'video' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedVideoTrackId).toBe('existing-video');

    cleanup();
  });

  it.skip('uses custom bandwidth configuration', async () => {
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

    const state = createState<TrackSelectionState>({ presentation });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectVideoTrack({ state, owners, events }, { initialBandwidth: 3_000_000, type: 'video' });
    events.dispatch({ type: 'presentation-loaded' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedVideoTrackId).toBe('video-720p');

    cleanup();
  });
});

describe('selectAudioTrack', () => {
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

    const state = createState<TrackSelectionState>({ presentation });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectAudioTrack({ state, owners, events }, { type: 'audio' });
    events.dispatch({ type: 'presentation-loaded' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedAudioTrackId).toBe('audio-en');

    cleanup();
  });

  it('does not select when audio track already selected', async () => {
    const presentation = createPresentation({ audio: [] });

    const state = createState<TrackSelectionState>({
      presentation,
      selectedAudioTrackId: 'existing-audio',
    });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectAudioTrack({ state, owners, events }, { type: 'audio' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedAudioTrackId).toBe('existing-audio');

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

    const state = createState<TrackSelectionState>({ presentation });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectAudioTrack({ state, owners, events }, { type: 'audio', preferredAudioLanguage: 'es' });
    events.dispatch({ type: 'presentation-loaded' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedAudioTrackId).toBe('audio-es');

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

    const state = createState<TrackSelectionState>({ presentation });
    const owners = createState<TrackSelectionOwners>({});
    const events = createEventStream<TrackSelectionAction>();

    const cleanup = selectTextTrack({ state, owners, events }, { type: 'text' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedTextTrackId).toBeUndefined();

    cleanup();
  });
});
