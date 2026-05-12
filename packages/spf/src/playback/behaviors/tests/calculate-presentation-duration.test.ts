import { describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { AudioTrack, MaybeResolvedPresentation, Presentation, VideoTrack } from '../../../media/types';
import { calculatePresentationDuration, type PresentationDurationState } from '../calculate-presentation-duration';

function makeState(initial: PresentationDurationState = {}): StateSignals<PresentationDurationState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
  };
}

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

describe('calculatePresentationDuration', () => {
  it('sets presentation.duration from resolved video track', async () => {
    const state = makeState();

    const cleanup = calculatePresentationDuration.setup({ state });

    state.presentation.set(
      createPresentation({
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
      })
    );
    state.selectedVideoTrackId.set('video-1');

    await vi.waitFor(() => {
      expect(state.presentation.get()?.duration).toBe(120.5);
    });

    cleanup();
  });

  it('sets presentation.duration from resolved audio track', async () => {
    const state = makeState();

    const cleanup = calculatePresentationDuration.setup({ state });

    state.presentation.set(
      createPresentation({
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
      })
    );
    state.selectedAudioTrackId.set('audio-1');

    await vi.waitFor(() => {
      expect(state.presentation.get()?.duration).toBe(90.75);
    });

    cleanup();
  });

  it('does not recalculate when duration already set', async () => {
    const state = makeState({
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

    const cleanup = calculatePresentationDuration.setup({ state });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.presentation.get()?.duration).toBe(60);

    cleanup();
  });

  it('does not set invalid durations', async () => {
    const state = makeState();

    const cleanup = calculatePresentationDuration.setup({ state });

    state.presentation.set(
      createPresentation({
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
      })
    );
    state.selectedVideoTrackId.set('video-1');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.presentation.get()?.duration).toBeUndefined();

    cleanup();
  });
});
