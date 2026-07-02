import { describe, expect, it } from 'vitest';
import type {
  AudioSelectionSet,
  PartiallyResolvedAudioTrack,
  PartiallyResolvedVideoTrack,
  Presentation,
  TextSelectionSet,
  VideoSelectionSet,
} from '../../types';
import {
  maxResolutionToPixelArea,
  pickAudioTrack,
  pickHighestResolutionVideoTrack,
  pickTextTrack,
  pickTrackUnderPixelArea,
  pickVideoTrack,
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
    const selected = pickVideoTrack(presentation);
    expect(selected).toBe('360p');

    // With 3 Mbps, should select 720p (2M fits, 4M doesn't with 0.85 margin)
    const selected2 = pickVideoTrack(presentation, { initialBandwidth: 3_000_000 });
    expect(selected2).toBe('720p');

    // With 5 Mbps, should select 1080p (4M fits with margin)
    const selected3 = pickVideoTrack(presentation, { initialBandwidth: 5_000_000 });
    expect(selected3).toBe('1080p');
  });

  it('returns undefined when no video tracks', () => {
    const presentation = createPresentation({ audio: [] });

    const selected = pickVideoTrack(presentation);
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
    const selected = pickVideoTrack(presentation, { initialBandwidth: 100_000 });
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
    });
    expect(selected).toBe('720p'); // Falls back since it's the only/lowest option
  });
});

describe('pickHighestResolutionVideoTrack', () => {
  it('selects the track with the highest width × height area', () => {
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
        id: '1080p',
        url: 'http://example.com/1080p.m3u8',
        bandwidth: 4_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 1920,
        height: 1080,
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
    ];

    const presentation = createPresentation({ video: tracks });
    expect(pickHighestResolutionVideoTrack(presentation)).toBe('1080p');
  });

  it('falls back to bandwidth when resolution metadata is missing', () => {
    const tracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: 'low',
        url: 'http://example.com/low.m3u8',
        bandwidth: 500_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
      {
        type: 'video',
        id: 'high',
        url: 'http://example.com/high.m3u8',
        bandwidth: 4_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
      },
    ];

    const presentation = createPresentation({ video: tracks });
    expect(pickHighestResolutionVideoTrack(presentation)).toBe('high');
  });

  it('breaks ties on equal resolution by bandwidth', () => {
    const tracks: PartiallyResolvedVideoTrack[] = [
      {
        type: 'video',
        id: '1080p-low',
        url: 'http://example.com/1080p-low.m3u8',
        bandwidth: 3_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 1920,
        height: 1080,
      },
      {
        type: 'video',
        id: '1080p-high',
        url: 'http://example.com/1080p-high.m3u8',
        bandwidth: 6_000_000,
        mimeType: 'video/mp4',
        codecs: ['avc1.42E01E'],
        width: 1920,
        height: 1080,
      },
    ];

    const presentation = createPresentation({ video: tracks });
    expect(pickHighestResolutionVideoTrack(presentation)).toBe('1080p-high');
  });

  it('returns undefined when no video tracks exist', () => {
    const presentation = createPresentation({ audio: [] });
    expect(pickHighestResolutionVideoTrack(presentation)).toBeUndefined();
  });
});

describe('maxResolutionToPixelArea', () => {
  it('translates `"<n>p"` strings to 16:9 pixel area', () => {
    expect(maxResolutionToPixelArea('720p')).toBe(720 * 1280);
    expect(maxResolutionToPixelArea('1080P')).toBe(1080 * 1920);
    expect(maxResolutionToPixelArea('1440p')).toBe(1440 * 2560);
    expect(maxResolutionToPixelArea('2160p')).toBe(2160 * 3840);
  });

  it('treats bare numeric strings as height (16:9 area)', () => {
    expect(maxResolutionToPixelArea('720')).toBe(720 * 1280);
  });

  it('treats bare numbers as a pixel-area cap', () => {
    expect(maxResolutionToPixelArea(921_600)).toBe(921_600);
  });

  it('returns +Infinity for unrecognized inputs (no cap)', () => {
    expect(maxResolutionToPixelArea(undefined)).toBe(Number.POSITIVE_INFINITY);
    expect(maxResolutionToPixelArea('garbage')).toBe(Number.POSITIVE_INFINITY);
    expect(maxResolutionToPixelArea('-720')).toBe(Number.POSITIVE_INFINITY);
    expect(maxResolutionToPixelArea(0)).toBe(Number.POSITIVE_INFINITY);
    expect(maxResolutionToPixelArea(-1)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('pickTrackUnderPixelArea', () => {
  const tracks = [
    { id: '360p', width: 640, height: 360, bandwidth: 500_000 },
    { id: '720p', width: 1280, height: 720, bandwidth: 2_000_000 },
    { id: '1080p', width: 1920, height: 1080, bandwidth: 4_000_000 },
    { id: '1440p', width: 2560, height: 1440, bandwidth: 8_000_000 },
  ];

  it('returns undefined for an empty list', () => {
    expect(pickTrackUnderPixelArea([])).toBeUndefined();
  });

  it('picks the highest-area track when no cap is provided', () => {
    expect(pickTrackUnderPixelArea(tracks)?.id).toBe('1440p');
  });

  it('picks the highest track at or below the cap', () => {
    expect(pickTrackUnderPixelArea(tracks, 1280 * 720)?.id).toBe('720p');
    expect(pickTrackUnderPixelArea(tracks, 1920 * 1080)?.id).toBe('1080p');
  });

  it('falls back to the lowest track when the cap excludes everything', () => {
    expect(pickTrackUnderPixelArea(tracks, 100)?.id).toBe('360p');
  });

  it('tiebreaks on bandwidth at equal pixel area', () => {
    const ties = [
      { id: '1080p-low', width: 1920, height: 1080, bandwidth: 3_000_000 },
      { id: '1080p-high', width: 1920, height: 1080, bandwidth: 6_000_000 },
    ];
    expect(pickTrackUnderPixelArea(ties)?.id).toBe('1080p-high');
  });

  it('treats missing dimensions as area 0', () => {
    const mixed = [
      { id: 'unknown', bandwidth: 1_000_000 },
      { id: '720p', width: 1280, height: 720, bandwidth: 2_000_000 },
    ];
    expect(pickTrackUnderPixelArea(mixed)?.id).toBe('720p');
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

    const selected = pickAudioTrack(presentation);
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

    const selected = pickAudioTrack(presentation, { preferredAudioLanguage: 'es' });
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

    const selected = pickAudioTrack(presentation);
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

    const selected = pickAudioTrack(presentation, { preferredAudioLanguage: 'en' });
    expect(selected).toBe('audio-en');
  });

  it('returns undefined when no audio tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = pickAudioTrack(presentation);
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

    const selected = pickTextTrack(presentation);
    expect(selected).toBeUndefined();
  });

  it('returns undefined when no text tracks', () => {
    const presentation = createPresentation({ video: [] });

    const selected = pickTextTrack(presentation);
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
    const selected = pickTextTrack(presentation, { enableDefaultTrack: true });
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

    const selected = pickTextTrack(presentation, { preferredSubtitleLanguage: 'es' });
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

    const selected = pickTextTrack(presentation, { enableDefaultTrack: true });
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
    const selected = pickTextTrack(presentation);
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
    const selected = pickTextTrack(presentation, { enableDefaultTrack: true });
    expect(selected).toBeUndefined();
  });
});
