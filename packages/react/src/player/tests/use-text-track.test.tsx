'use client';

import { cleanup, renderHook } from '@testing-library/react';
import type { MediaTextCue } from '@videojs/media';
import { afterEach, describe, expect, it } from 'vitest';

import { createPlayerWrapper } from '../../testing/mocks';
import { useTextTrack } from '../use-text-track';

afterEach(cleanup);

const chapter: MediaTextCue = {
  startTime: 0,
  endTime: 12,
  text: 'Introduction',
};

function createWrapper() {
  return createPlayerWrapper({
    chaptersCues: [chapter],
    thumbnailCues: [],
    thumbnailTrackSrc: 'https://example.com/storyboard.vtt',
    textTrackList: [
      {
        kind: 'chapters',
        label: 'Chapters',
        language: 'en',
        mode: 'hidden',
      },
      {
        kind: 'metadata',
        label: 'thumbnails',
        language: '',
        mode: 'hidden',
      },
    ],
    subtitlesShowing: false,
  }).Wrapper;
}

describe('useTextTrack', () => {
  it('gets chapters by track kind', () => {
    const { result } = renderHook(() => useTextTrack('chapters'), { wrapper: createWrapper() });

    expect(result.current?.cues).toEqual([chapter]);
    expect(result.current?.src).toBeNull();
  });

  it('matches an optional track label', () => {
    const { result } = renderHook(() => useTextTrack('metadata', 'thumbnails'), {
      wrapper: createWrapper(),
    });

    expect(result.current?.src).toBe('https://example.com/storyboard.vtt');
  });

  it('returns undefined when no track matches', () => {
    const { result } = renderHook(() => useTextTrack('metadata', 'other'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });
});
