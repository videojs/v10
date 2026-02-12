import { describe, expect, it } from 'vitest';
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
  canSelectInitialQuality,
  type InitialQualityState,
  selectAudioTrack,
  selectInitialQuality,
  selectTextTrack,
  selectVideoTrack,
  shouldSelectInitialQuality,
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

describe('canSelectInitialQuality', () => {
  it('returns true when presentation exists and no tracks selected', () => {
    const state: InitialQualityState = {
      presentation: createPresentation({ video: [] }),
    };

    expect(canSelectInitialQuality(state)).toBe(true);
  });

  it('returns false when presentation is missing', () => {
    const state: InitialQualityState = {};

    expect(canSelectInitialQuality(state)).toBe(false);
  });

  it('returns false when video track already selected', () => {
    const state: InitialQualityState = {
      presentation: createPresentation({ video: [] }),
      selectedVideoTrackId: 'video-1',
    };

    expect(canSelectInitialQuality(state)).toBe(false);
  });

  it('returns false when audio track already selected', () => {
    const state: InitialQualityState = {
      presentation: createPresentation({ audio: [] }),
      selectedAudioTrackId: 'audio-1',
    };

    expect(canSelectInitialQuality(state)).toBe(false);
  });

  it('returns false when text track already selected', () => {
    const state: InitialQualityState = {
      presentation: createPresentation({ text: [] }),
      selectedTextTrackId: 'text-1',
    };

    expect(canSelectInitialQuality(state)).toBe(false);
  });
});

describe('shouldSelectInitialQuality', () => {
  it('returns true when conditions are met', () => {
    const state: InitialQualityState = {
      presentation: createPresentation({ video: [] }),
    };

    expect(shouldSelectInitialQuality(state)).toBe(true);
  });
});

describe('selectVideoTrack', () => {
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
    const selected = selectVideoTrack(presentation, {});
    expect(selected).toBe('360p');

    // With 3 Mbps, should select 720p (2M fits, 4M doesn't with 0.85 margin)
    const selected2 = selectVideoTrack(presentation, { initialBandwidth: 3_000_000 });
    expect(selected2).toBe('720p');

    // With 5 Mbps, should select 1080p (4M fits with margin)
    const selected3 = selectVideoTrack(presentation, { initialBandwidth: 5_000_000 });
    expect(selected3).toBe('1080p');
  });

  it('returns undefined when no video tracks', () => {
    const presentation = createPresentation({ audio: [] });

    const selected = selectVideoTrack(presentation, {});
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
    const selected = selectVideoTrack(presentation, { initialBandwidth: 100_000 });
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
    const selected = selectVideoTrack(presentation, {
      initialBandwidth: 2_050_000,
      safetyMargin: 0.95,
    });
    expect(selected).toBe('720p'); // Falls back since it's the only/lowest option
  });
});

describe('selectAudioTrack', () => {
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

    const selected = selectAudioTrack(presentation, {});
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

    const selected = selectAudioTrack(presentation, { preferredAudioLanguage: 'es' });
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

    const selected = selectAudioTrack(presentation, {});
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

    const selected = selectAudioTrack(presentation, { preferredAudioLanguage: 'en' });
    expect(selected).toBe('audio-en');
  });

  it('returns undefined when no audio tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = selectAudioTrack(presentation, {});
    expect(selected).toBeUndefined();
  });
});

describe('pickTextTrack', () => {
  it('returns undefined by default (user opt-in)', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
    ];

    const presentation = createPresentation({ text: tracks });

    const selected = selectTextTrack(presentation, {});
    expect(selected).toBeUndefined();
  });

  it('returns undefined when no text tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = selectTextTrack(presentation, {});
    expect(selected).toBeUndefined();
  });

  it('excludes FORCED tracks by default', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-en-forced',
        url: 'http://example.com/text-en-forced.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English (Forced)',
        kind: 'subtitles' as const,
        language: 'en',
        forced: true,
        default: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    // FORCED track excluded by default, even with DEFAULT=YES
    const selected = pickTextTrack(presentation, { type: 'text', enableDefaultTrack: true });
    expect(selected).toBeUndefined();
  });

  it('includes FORCED tracks when includeForcedTracks enabled', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-en-forced',
        url: 'http://example.com/text-en-forced.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English (Forced)',
        kind: 'subtitles' as const,
        language: 'en',
        forced: true,
        default: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    // FORCED track included and selected when enabled
    const selected = pickTextTrack(presentation, {
      type: 'text',
      includeForcedTracks: true,
      enableDefaultTrack: true,
    });
    expect(selected).toBe('text-en-forced');
  });

  it('selects preferred language when specified', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-es',
        url: 'http://example.com/text-es.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'Spanish',
        kind: 'subtitles' as const,
        language: 'es',
      },
    ];

    const presentation = createPresentation({ text: tracks });

    const selected = pickTextTrack(presentation, { type: 'text', preferredSubtitleLanguage: 'es' });
    expect(selected).toBe('text-es');
  });

  it('selects DEFAULT track when enableDefaultTrack is true', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-es',
        url: 'http://example.com/text-es.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'Spanish',
        kind: 'subtitles' as const,
        language: 'es',
        default: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    const selected = pickTextTrack(presentation, { type: 'text', enableDefaultTrack: true });
    expect(selected).toBe('text-es');
  });

  it('does NOT select DEFAULT track when enableDefaultTrack is false', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-es',
        url: 'http://example.com/text-es.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'Spanish',
        kind: 'subtitles' as const,
        language: 'es',
        default: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    // enableDefaultTrack defaults to false
    const selected = pickTextTrack(presentation, { type: 'text' });
    expect(selected).toBeUndefined();
  });

  it('prefers language match over DEFAULT flag', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en',
        url: 'http://example.com/text-en.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English',
        kind: 'subtitles' as const,
        language: 'en',
      },
      {
        type: 'text' as const,
        id: 'text-es',
        url: 'http://example.com/text-es.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'Spanish',
        kind: 'subtitles' as const,
        language: 'es',
        default: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    // Preferred language trumps DEFAULT
    const selected = pickTextTrack(presentation, {
      type: 'text',
      preferredSubtitleLanguage: 'en',
      enableDefaultTrack: true,
    });
    expect(selected).toBe('text-en');
  });

  it('returns undefined when all tracks are FORCED and includeForcedTracks is false', () => {
    const tracks = [
      {
        type: 'text' as const,
        id: 'text-en-forced',
        url: 'http://example.com/text-en-forced.m3u8',
        bandwidth: 256,
        mimeType: 'application/mp4',
        codecs: [],
        groupId: 'text',
        label: 'English (Forced)',
        kind: 'subtitles' as const,
        language: 'en',
        forced: true,
      },
    ];

    const presentation = createPresentation({ text: tracks });

    // All tracks filtered out - no selection
    const selected = pickTextTrack(presentation, { type: 'text', enableDefaultTrack: true });
    expect(selected).toBeUndefined();
  });
});

describe('selectInitialQuality', () => {
  it('selects video, audio, and skips text on initial load', async () => {
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

    const presentation = createPresentation({ video: videoTracks, audio: audioTracks });

    const state = createState<InitialQualityState>({ presentation });
    const cleanup = selectInitialQuality({ state });

    // Wait for selection
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedVideoTrackId).toBe('video-360p');
    expect(state.current.selectedAudioTrackId).toBe('audio-en');
    expect(state.current.selectedTextTrackId).toBeUndefined();

    cleanup();
  });

  it('does not select when tracks already selected', async () => {
    const presentation = createPresentation({ video: [], audio: [] });

    const state = createState<InitialQualityState>({
      presentation,
      selectedVideoTrackId: 'existing-video',
    });

    const cleanup = selectInitialQuality({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not change existing selection
    expect(state.current.selectedVideoTrackId).toBe('existing-video');

    cleanup();
  });

  it('uses custom configuration', async () => {
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

    const presentation = createPresentation({ video: videoTracks, audio: audioTracks });

    const state = createState<InitialQualityState>({ presentation });
    const cleanup = selectInitialQuality(
      { state },
      {
        initialBandwidth: 3_000_000,
        preferredAudioLanguage: 'es',
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.selectedVideoTrackId).toBe('video-720p');
    expect(state.current.selectedAudioTrackId).toBe('audio-es');

    cleanup();
  });

  it('only runs once (not on subsequent presentation updates)', async () => {
    const presentation = createPresentation({ video: [], audio: [] });

    const state = createState<InitialQualityState>({ presentation });
    const cleanup = selectInitialQuality({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstVideoId = state.current.selectedVideoTrackId;

    // Update presentation
    state.patch({ presentation: { ...presentation } });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should not re-select
    expect(state.current.selectedVideoTrackId).toBe(firstVideoId);

    cleanup();
  });
});
