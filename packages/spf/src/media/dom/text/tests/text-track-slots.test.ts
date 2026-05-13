import { describe, expect, it } from 'vitest';
import type { PartiallyResolvedTextTrack } from '../../../types';
import { addTextTrackSlot, syncTextTrackModes } from '../text-track-slots';

function makeModelTrack(overrides: Partial<PartiallyResolvedTextTrack> = {}): PartiallyResolvedTextTrack {
  return {
    id: 'track-en',
    type: 'text',
    kind: 'subtitles',
    label: 'English',
    language: 'en',
    url: 'data:text/vtt,',
    mimeType: 'text/vtt',
    bandwidth: 0,
    groupId: 'subs',
    ...overrides,
  } as PartiallyResolvedTextTrack;
}

describe('addTextTrackSlot', () => {
  it('appends a <track> child mirroring the model attributes', () => {
    const media = document.createElement('video');
    const el = addTextTrackSlot(media, makeModelTrack());

    expect(el.tagName).toBe('TRACK');
    expect(el.parentElement).toBe(media);
    expect(el.id).toBe('track-en');
    expect(el.kind).toBe('subtitles');
    expect(el.label).toBe('English');
    expect(el.srclang).toBe('en');
    expect(el.hasAttribute('data-src-track')).toBe(true);
  });

  it('marks the track as default when the model is default', () => {
    const media = document.createElement('video');
    const el = addTextTrackSlot(media, makeModelTrack({ default: true }));

    expect(el.default).toBe(true);
  });

  it('omits srclang when the model has no language', () => {
    const media = document.createElement('video');
    const el = addTextTrackSlot(media, makeModelTrack({ language: undefined }));

    expect(el.srclang).toBe('');
  });

  it('returns the element so the caller can remove it', () => {
    const media = document.createElement('video');
    const el = addTextTrackSlot(media, makeModelTrack());

    el.remove();
    expect(media.children.length).toBe(0);
  });
});

describe('syncTextTrackModes', () => {
  function setupTextTracks(tracks: { id: string; kind?: TextTrackKind }[]): {
    media: HTMLVideoElement;
    elements: HTMLTrackElement[];
  } {
    const media = document.createElement('video');
    const elements = tracks.map(({ id, kind = 'subtitles' }) => {
      const el = document.createElement('track');
      el.id = id;
      el.kind = kind;
      el.src = 'data:text/vtt,';
      media.appendChild(el);
      return el;
    });
    return { media, elements };
  }

  it('sets the matching track to showing and others to disabled', () => {
    const { media, elements } = setupTextTracks([{ id: 'track-en' }, { id: 'track-es' }]);
    syncTextTrackModes(media.textTracks, 'track-en');

    expect(elements[0]!.track.mode).toBe('showing');
    expect(elements[1]!.track.mode).toBe('disabled');
  });

  it('disables all tracks when selectedId is undefined', () => {
    const { media, elements } = setupTextTracks([{ id: 'track-en' }, { id: 'track-es' }]);
    elements[0]!.track.mode = 'showing';

    syncTextTrackModes(media.textTracks, undefined);

    expect(elements[0]!.track.mode).toBe('disabled');
    expect(elements[1]!.track.mode).toBe('disabled');
  });

  it('leaves non-subtitle/caption tracks untouched', () => {
    const { media, elements } = setupTextTracks([
      { id: 'subs-en' },
      { id: 'chapters-en', kind: 'chapters' },
      { id: 'metadata', kind: 'metadata' },
    ]);
    elements[1]!.track.mode = 'hidden';
    elements[2]!.track.mode = 'hidden';

    syncTextTrackModes(media.textTracks, 'subs-en');

    expect(elements[0]!.track.mode).toBe('showing');
    expect(elements[1]!.track.mode).toBe('hidden');
    expect(elements[2]!.track.mode).toBe('hidden');
  });

  it('treats caption-kind tracks the same as subtitles', () => {
    const { media, elements } = setupTextTracks([{ id: 'caps-en', kind: 'captions' }]);

    syncTextTrackModes(media.textTracks, 'caps-en');
    expect(elements[0]!.track.mode).toBe('showing');

    syncTextTrackModes(media.textTracks, undefined);
    expect(elements[0]!.track.mode).toBe('disabled');
  });
});
