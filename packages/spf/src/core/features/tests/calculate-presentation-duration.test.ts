import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../state/create-state';
import type { AudioTrack, Presentation, VideoTrack } from '../../types';
import {
  calculatePresentationDuration,
  canCalculateDuration,
  getDurationFromResolvedTracks,
  type PresentationDurationState,
  shouldCalculateDuration,
} from '../calculate-presentation-duration';

// Helper to create a minimal presentation with proper structure for getSelectedTrack
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

const mockPresentation = (overrides: Partial<Presentation> = {}): Presentation =>
  ({
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    startTime: 0,
    selectionSets: [],
    ...overrides,
  }) as Presentation;

describe('canCalculateDuration', () => {
  it('returns true when presentation and video track exist', () => {
    const state: PresentationDurationState = {
      presentation: mockPresentation(),
      selectedVideoTrackId: 'video-1',
    };

    expect(canCalculateDuration(state)).toBe(true);
  });

  it('returns true when presentation and audio track exist', () => {
    const state: PresentationDurationState = {
      presentation: mockPresentation(),
      selectedAudioTrackId: 'audio-1',
    };

    expect(canCalculateDuration(state)).toBe(true);
  });

  it('returns false when presentation is missing', () => {
    const state: PresentationDurationState = {
      selectedVideoTrackId: 'video-1',
    };

    expect(canCalculateDuration(state)).toBe(false);
  });

  it('returns false when no tracks are selected', () => {
    const state: PresentationDurationState = {
      presentation: mockPresentation(),
    };

    expect(canCalculateDuration(state)).toBe(false);
  });
});

describe('shouldCalculateDuration', () => {
  it('returns false when duration already set', () => {
    const state: PresentationDurationState = {
      presentation: mockPresentation({ duration: 60 }),
      selectedVideoTrackId: 'video-1',
    };

    expect(shouldCalculateDuration(state)).toBe(false);
  });

  it('returns false when track not resolved', () => {
    const state: PresentationDurationState = {
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

    expect(shouldCalculateDuration(state)).toBe(false);
  });

  it('returns true when video track is resolved', () => {
    const state: PresentationDurationState = {
      presentation: createPresentation({
        video: [
          {
            id: 'video-1',
            type: 'video',
            url: 'http://example.com/video.m3u8',
            mimeType: 'video/mp4',
            codecs: ['avc1.42E01E'],
            bandwidth: 1000000,
            duration: 60,
            startTime: 0,
            segments: [{ id: 'seg-1', url: 'http://example.com/seg1.m4s', duration: 10, startTime: 0 }],
            initialization: { id: 'init', url: 'http://example.com/init.mp4' },
          } as VideoTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
    };

    expect(shouldCalculateDuration(state)).toBe(true);
  });
});

describe('getDurationFromResolvedTracks', () => {
  it('returns video track duration when available', () => {
    const state: PresentationDurationState = {
      presentation: createPresentation({
        video: [
          {
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
          } as VideoTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(120.5);
  });

  it('returns audio track duration when video not available', () => {
    const state: PresentationDurationState = {
      presentation: createPresentation({
        audio: [
          {
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
          } as AudioTrack,
        ],
      }),
      selectedAudioTrackId: 'audio-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(90.25);
  });

  it('prefers video track over audio track', () => {
    const state: PresentationDurationState = {
      presentation: createPresentation({
        video: [
          {
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
          } as VideoTrack,
        ],
        audio: [
          {
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
          } as AudioTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(120.5);
  });

  it('returns undefined when no tracks resolved', () => {
    const state: PresentationDurationState = {
      presentation: mockPresentation(),
    };

    expect(getDurationFromResolvedTracks(state)).toBeUndefined();
  });
});

describe('calculatePresentationDuration', () => {
  it('sets presentation.duration from resolved video track', async () => {
    const state = createState<PresentationDurationState>({});

    const cleanup = calculatePresentationDuration({ state });

    state.patch({
      presentation: createPresentation({
        video: [
          {
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
          } as VideoTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
    });

    await vi.waitFor(() => {
      expect(state.current.presentation?.duration).toBe(120.5);
    });

    cleanup();
  });

  it('sets presentation.duration from resolved audio track', async () => {
    const state = createState<PresentationDurationState>({});

    const cleanup = calculatePresentationDuration({ state });

    state.patch({
      presentation: createPresentation({
        audio: [
          {
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
            duration: 90.75,
            startTime: 0,
            segments: [{ id: 'seg-1', url: 'http://example.com/seg1.m4s', duration: 10, startTime: 0 }],
            initialization: { id: 'init', url: 'http://example.com/init.mp4' },
          } as AudioTrack,
        ],
      }),
      selectedAudioTrackId: 'audio-1',
    });

    await vi.waitFor(() => {
      expect(state.current.presentation?.duration).toBe(90.75);
    });

    cleanup();
  });

  it('does not recalculate when duration already set', async () => {
    const state = createState<PresentationDurationState>({
      presentation: createPresentation({
        duration: 60,
        video: [
          {
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
          } as VideoTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
    });

    const cleanup = calculatePresentationDuration({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.presentation?.duration).toBe(60);

    cleanup();
  });

  it('does not set invalid durations', async () => {
    const state = createState<PresentationDurationState>({});

    const cleanup = calculatePresentationDuration({ state });

    state.patch({
      presentation: createPresentation({
        video: [
          {
            id: 'video-1',
            type: 'video',
            url: 'http://example.com/video.m3u8',
            mimeType: 'video/mp4',
            codecs: ['avc1.42E01E'],
            bandwidth: 1000000,
            duration: Infinity,
            startTime: 0,
            segments: [{ id: 'seg-1', url: 'http://example.com/seg1.m4s', duration: 10, startTime: 0 }],
            initialization: { id: 'init', url: 'http://example.com/init.mp4' },
          } as VideoTrack,
        ],
      }),
      selectedVideoTrackId: 'video-1',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.presentation?.duration).toBeUndefined();

    cleanup();
  });
});
