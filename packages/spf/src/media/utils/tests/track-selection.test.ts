import { describe, expect, it } from 'vitest';
import type { AudioTrack, Presentation, VideoTrack } from '../../types';
import { getResolvedSelectedTrackDuration, getVideoRenditions, type TrackSelectionState } from '../track-selection';

function createPresentation(config: { video?: VideoTrack[]; audio?: AudioTrack[]; duration?: number }): Presentation {
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
    });
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
    });
  }

  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets,
    startTime: 0,
    ...(config.duration !== undefined && { duration: config.duration }),
  } as Presentation;
}

const resolvedVideoTrack = (overrides: Partial<VideoTrack> = {}): VideoTrack =>
  ({
    id: 'video-1',
    type: 'video',
    url: 'http://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.42E01E'],
    bandwidth: 1000000,
    duration: 120.5,
    startTime: 0,
    segments: [{ id: 'seg-1', url: 'http://example.com/seg1.m4s', duration: 10, startTime: 0 }],
    initialization: { id: 'init', url: 'http://example.com/init.mp4' },
    ...overrides,
  }) as VideoTrack;

const resolvedAudioTrack = (overrides: Partial<AudioTrack> = {}): AudioTrack =>
  ({
    id: 'audio-1',
    type: 'audio',
    url: 'http://example.com/audio.m3u8',
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    bandwidth: 128000,
    groupId: 'audio-group',
    name: 'English',
    sampleRate: 48000,
    channels: 2,
    duration: 90.25,
    startTime: 0,
    segments: [{ id: 'seg-1', url: 'http://example.com/seg1.m4s', duration: 10, startTime: 0 }],
    initialization: { id: 'init', url: 'http://example.com/init.mp4' },
    ...overrides,
  }) as AudioTrack;

describe('getResolvedSelectedTrackDuration', () => {
  it('returns the resolved video track duration when video is selected and resolved', () => {
    const state: TrackSelectionState = {
      presentation: createPresentation({ video: [resolvedVideoTrack({ duration: 120.5 })] }),
      selectedVideoTrackId: 'video-1',
    };
    expect(getResolvedSelectedTrackDuration(state)).toBe(120.5);
  });

  it('falls back to audio when only audio is selected and resolved', () => {
    const state: TrackSelectionState = {
      presentation: createPresentation({ audio: [resolvedAudioTrack({ duration: 90.25 })] }),
      selectedAudioTrackId: 'audio-1',
    };
    expect(getResolvedSelectedTrackDuration(state)).toBe(90.25);
  });

  it('prefers video over audio when both are resolved', () => {
    const state: TrackSelectionState = {
      presentation: createPresentation({
        video: [resolvedVideoTrack({ duration: 120.5 })],
        audio: [resolvedAudioTrack({ duration: 90.25 })],
      }),
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
    };
    expect(getResolvedSelectedTrackDuration(state)).toBe(120.5);
  });

  it('returns undefined when the selected video track is not yet resolved', () => {
    const state: TrackSelectionState = {
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [{ tracks: [{ id: 'video-1', type: 'video' }] }],
          },
        ],
      } as any,
      selectedVideoTrackId: 'video-1',
    };
    expect(getResolvedSelectedTrackDuration(state)).toBeUndefined();
  });

  it('returns undefined when no track is selected', () => {
    const state: TrackSelectionState = {
      presentation: createPresentation({ video: [resolvedVideoTrack()] }),
    };
    expect(getResolvedSelectedTrackDuration(state)).toBeUndefined();
  });

  it('returns undefined when there is no presentation', () => {
    expect(getResolvedSelectedTrackDuration({})).toBeUndefined();
  });
});

describe('getVideoRenditions', () => {
  it('maps the first video switching set to normalized rendition info', () => {
    const presentation = createPresentation({
      video: [
        resolvedVideoTrack({ id: 'hd', url: 'hd.m3u8', width: 1920, height: 1080, bandwidth: 6_000_000 }),
        resolvedVideoTrack({ id: 'sd', url: 'sd.m3u8', width: 640, height: 360, bandwidth: 800_000 }),
      ],
    });

    expect(getVideoRenditions({ presentation })).toEqual([
      {
        id: 'hd',
        url: 'hd.m3u8',
        width: 1920,
        height: 1080,
        codecs: ['avc1.42E01E'],
        bandwidth: 6_000_000,
        frameRate: undefined,
      },
      {
        id: 'sd',
        url: 'sd.m3u8',
        width: 640,
        height: 360,
        codecs: ['avc1.42E01E'],
        bandwidth: 800_000,
        frameRate: undefined,
      },
    ]);
  });

  it('carries the raw FrameRate through (DOM consumers normalize)', () => {
    const frameRate = { frameRateNumerator: 30000, frameRateDenominator: 1001 };
    const presentation = createPresentation({ video: [resolvedVideoTrack({ frameRate })] });

    expect(getVideoRenditions({ presentation })[0]?.frameRate).toEqual(frameRate);
  });

  it('returns an empty array when the presentation is unresolved or has no video', () => {
    expect(getVideoRenditions({})).toEqual([]);
    expect(getVideoRenditions({ presentation: { url: 'x.m3u8' } })).toEqual([]);
    expect(getVideoRenditions({ presentation: createPresentation({ audio: [resolvedAudioTrack()] }) })).toEqual([]);
  });
});
