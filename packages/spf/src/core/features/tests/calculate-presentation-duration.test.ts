import { describe, expect, it, vi } from 'vitest';
import { createState } from '../../state/create-state';
import type { Presentation } from '../../types';
import {
  calculatePresentationDuration,
  canCalculateDuration,
  getDurationFromResolvedTracks,
  type PresentationDurationState,
  shouldCalculateDuration,
} from '../calculate-presentation-duration';

describe('canCalculateDuration', () => {
  it('returns true when presentation and video track exist', () => {
    const state: PresentationDurationState = {
      presentation: { url: 'http://example.com/playlist.m3u8' } as Presentation,
      selectedVideoTrackId: 'video-1',
    };

    expect(canCalculateDuration(state)).toBe(true);
  });

  it('returns true when presentation and audio track exist', () => {
    const state: PresentationDurationState = {
      presentation: { url: 'http://example.com/playlist.m3u8' } as Presentation,
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
      presentation: { url: 'http://example.com/playlist.m3u8' } as Presentation,
    };

    expect(canCalculateDuration(state)).toBe(false);
  });
});

describe('shouldCalculateDuration', () => {
  it('returns false when duration already set', () => {
    const state: PresentationDurationState = {
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        duration: 60,
      } as Presentation,
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
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: 60,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedVideoTrackId: 'video-1',
    };

    expect(shouldCalculateDuration(state)).toBe(true);
  });
});

describe('getDurationFromResolvedTracks', () => {
  it('returns video track duration when available', () => {
    const state: PresentationDurationState = {
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: 120.5,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedVideoTrackId: 'video-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(120.5);
  });

  it('returns audio track duration when video not available', () => {
    const state: PresentationDurationState = {
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'audio',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'audio-1',
                    type: 'audio',
                    duration: 90.25,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedAudioTrackId: 'audio-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(90.25);
  });

  it('prefers video track over audio track', () => {
    const state: PresentationDurationState = {
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: 120.5,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
          {
            type: 'audio',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'audio-1',
                    type: 'audio',
                    duration: 90.25,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedVideoTrackId: 'video-1',
      selectedAudioTrackId: 'audio-1',
    };

    expect(getDurationFromResolvedTracks(state)).toBe(120.5);
  });

  it('returns undefined when no tracks resolved', () => {
    const state: PresentationDurationState = {
      presentation: {
        id: 'pres-1',
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [],
      } as Presentation,
    };

    expect(getDurationFromResolvedTracks(state)).toBeUndefined();
  });
});

describe('calculatePresentationDuration', () => {
  it('sets presentation.duration from resolved video track', async () => {
    const state = createState<PresentationDurationState>({});

    const cleanup = calculatePresentationDuration({ state });

    state.patch({
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: 120.5,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
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
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'audio',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'audio-1',
                    type: 'audio',
                    duration: 90.75,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedAudioTrackId: 'audio-1',
    });

    await vi.waitFor(() => {
      expect(state.current.presentation?.duration).toBe(90.75);
    });

    cleanup();
  });

  it('does not recalculate when duration already set', async () => {
    const state = createState<PresentationDurationState>({
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        duration: 60,
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: 120.5,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
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
      presentation: {
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [
          {
            type: 'video',
            switchingSets: [
              {
                tracks: [
                  {
                    id: 'video-1',
                    type: 'video',
                    duration: Infinity,
                    segments: [{}],
                  },
                ],
              },
            ],
          },
        ],
      } as any,
      selectedVideoTrackId: 'video-1',
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.current.presentation?.duration).toBeUndefined();

    cleanup();
  });
});
