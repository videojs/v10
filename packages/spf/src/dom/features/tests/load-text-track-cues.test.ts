import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation, Segment, TextTrack } from '../../../core/types';
import {
  canLoadTextTrackCues,
  loadTextTrackCues,
  shouldLoadTextTrackCues,
  type TextTrackCueLoadingOwners,
  type TextTrackCueLoadingState,
} from '../load-text-track-cues';

// Mock parseVttSegment
vi.mock('../../text/parse-vtt-segment', () => ({
  parseVttSegment: vi.fn((url: string) => {
    if (url.includes('fail')) {
      return Promise.reject(new Error('Failed to load'));
    }
    return Promise.resolve([new VTTCue(0, 5, `Subtitle from ${url}`)]);
  }),
  destroyVttParser: vi.fn(),
}));

function createMockPresentation(tracks: Partial<TextTrack>[]): Presentation {
  return {
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [
      {
        type: 'text',
        switchingSets: [
          {
            tracks: tracks.map((t) => ({
              id: t.id || 'text-1',
              type: 'text' as const,
              url: t.url || 'https://example.com/text.m3u8',
              mimeType: 'text/vtt',
              bandwidth: 0,
              groupId: 'subs',
              label: t.label || 'English',
              kind: (t.kind || 'subtitles') as 'subtitles' | 'captions',
              language: t.language || 'en',
              segments: t.segments || [],
              ...t,
            })),
          },
        ],
      },
    ],
  } as Presentation;
}

function createMockSegments(count: number): Segment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `segment-${i}`,
    url: `https://example.com/segment-${i}.vtt`,
    duration: 10,
    startTime: i * 10,
  }));
}

describe('canLoadTextTrackCues', () => {
  it('returns false when no selected track', () => {
    const state: TextTrackCueLoadingState = {
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map(),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns false when no track elements', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {};

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns false when track element does not exist for selected track', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map(),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns true when track selected and elements exist', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([]),
    };
    const trackElement = document.createElement('track');
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(canLoadTextTrackCues(state, owners)).toBe(true);
  });
});

describe('shouldLoadTextTrackCues', () => {
  it('returns false when track not resolved', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          // No segments = not resolved
        },
      ]),
    };
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(shouldLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns false when cues already loaded', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    };
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    // Add a cue to simulate already loaded
    trackElement.track.addCue(new VTTCue(0, 1, 'Already loaded'));

    expect(shouldLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('returns true when track resolved and no cues', () => {
    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    };
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    expect(shouldLoadTextTrackCues(state, owners)).toBe(true);
  });
});

describe('loadTextTrackCues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: We cannot test actual cue addition in unit tests because the vitest
  // browser environment clears manually added cues after async operations.
  // These tests verify the orchestration logic and that parseVttSegment is called.

  it('does nothing when track not selected', async () => {
    const state = createState<TextTrackCueLoadingState>({
      presentation: createMockPresentation([]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map(),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).not.toHaveBeenCalled();

    cleanup();
  });

  it('triggers loading for single segment', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).toHaveBeenCalledTimes(1);
    expect(parseVttSegment).toHaveBeenCalledWith('https://example.com/segment-0.vtt');

    cleanup();
  });

  it('triggers loading for multiple segments', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(3),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).toHaveBeenCalledTimes(3);
    expect(parseVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/segment-1.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    cleanup();
  });

  it('skips loading when shouldLoadTextTrackCues returns false', () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    // Pre-add a cue (must check synchronously before it disappears)
    trackElement.track.addCue(new VTTCue(0, 1, 'Existing cue'));

    const state: TextTrackCueLoadingState = {
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    };
    const owners: TextTrackCueLoadingOwners = {
      textTracks: new Map([['text-1', trackElement]]),
    };

    // Check synchronously - cue exists, so should not load
    expect(shouldLoadTextTrackCues(state, owners)).toBe(false);
  });

  it('continues on segment error (partial loading)', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);
    trackElement.track.mode = 'hidden'; // Enable cue access

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-1',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: [
            { id: 'seg-0', url: 'https://example.com/segment-0.vtt', duration: 10, startTime: 0 },
            { id: 'seg-1', url: 'https://example.com/fail.vtt', duration: 10, startTime: 10 },
            { id: 'seg-2', url: 'https://example.com/segment-2.vtt', duration: 10, startTime: 20 },
          ] as Segment[],
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-1', trackElement]]),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    // Verify all segments were attempted
    expect(parseVttSegment).toHaveBeenCalledTimes(3);
    expect(parseVttSegment).toHaveBeenNthCalledWith(1, 'https://example.com/segment-0.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(2, 'https://example.com/fail.vtt');
    expect(parseVttSegment).toHaveBeenNthCalledWith(3, 'https://example.com/segment-2.vtt');

    // Verify error was logged for the failing segment
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load VTT segment'),
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
    cleanup();
  });

  it('does nothing when track not in presentation', async () => {
    const trackElement = document.createElement('track');
    const video = document.createElement('video');
    video.appendChild(trackElement);

    const state = createState<TextTrackCueLoadingState>({
      selectedTextTrackId: 'text-999',
      presentation: createMockPresentation([
        {
          id: 'text-1',
          segments: createMockSegments(1),
        },
      ]),
    });
    const owners = createState<TextTrackCueLoadingOwners>({
      textTracks: new Map([['text-999', trackElement]]),
    });

    const cleanup = loadTextTrackCues({ state, owners });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    expect(parseVttSegment).not.toHaveBeenCalled();

    cleanup();
  });
});
