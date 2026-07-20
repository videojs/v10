import { describe, expect, it } from 'vitest';
import type { AudioTrack, Presentation, VideoTrack } from '../../types';
import { getResolvedSelectedTrackDuration, type TrackSelectionState } from '../track-selection';

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
