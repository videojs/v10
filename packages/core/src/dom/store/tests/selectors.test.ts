import type { MediaTextCue, MediaTextTrack, MediaTextTrackState } from '@videojs/media';
import { describe, expect, it, vi } from 'vitest';
import { createTextTrackSelector, getTextTrack } from '../selectors';

const chapter: MediaTextCue = {
  startTime: 0,
  endTime: 10,
  text: 'Introduction',
};

function createState(): MediaTextTrackState {
  const chapterTrack: MediaTextTrack<'chapters'> = {
    kind: 'chapters',
    label: 'Chapters',
    language: 'en',
    mode: 'hidden',
  };
  const thumbnailTrack: MediaTextTrack<'metadata'> = {
    kind: 'metadata',
    label: 'thumbnails',
    language: '',
    mode: 'hidden',
  };

  return {
    chaptersCues: [chapter],
    thumbnailCues: [],
    thumbnailTrackSrc: 'https://example.com/storyboard.vtt',
    textTrackList: [chapterTrack, thumbnailTrack],
    subtitlesShowing: false,
    toggleSubtitles: vi.fn(),
    selectSubtitlesTrack: vi.fn(),
  };
}

describe('getTextTrack', () => {
  it('gets a chapter track with its cues', () => {
    expect(getTextTrack(createState(), 'chapters')).toEqual({
      kind: 'chapters',
      label: 'Chapters',
      language: 'en',
      mode: 'hidden',
      cues: [chapter],
      src: null,
    });
  });

  it('optionally matches a label', () => {
    const state = createState();
    state.textTrackList.push({
      kind: 'chapters',
      label: 'Other chapters',
      language: 'sv',
      mode: 'hidden',
    });

    expect(getTextTrack(state, 'chapters', 'Chapters')?.cues).toEqual([chapter]);
    expect(getTextTrack(state, 'chapters', 'Other chapters')).toBeUndefined();
    expect(getTextTrack(state, 'metadata', 'thumbnails')).toMatchObject({
      kind: 'metadata',
      label: 'thumbnails',
    });
    expect(getTextTrack(state, 'metadata', 'other')).toBeUndefined();
  });

  it('gets the source for a thumbnail track', () => {
    expect(getTextTrack(createState(), 'metadata', 'thumbnails')).toMatchObject({
      cues: [],
      src: 'https://example.com/storyboard.vtt',
    });
  });
});

describe('createTextTrackSelector', () => {
  it('selects a chapter track from player state', () => {
    const state = createState();
    const selector = createTextTrackSelector('chapters');

    expect(selector(state)?.cues).toEqual([chapter]);
    expect(selector.displayName).toBe('textTrack:chapters');
  });

  it('returns undefined when the text track feature is missing', () => {
    expect(createTextTrackSelector('chapters')({})).toBeUndefined();
  });
});
