import { describe, expect, it } from 'vitest';
import type { PartiallyResolvedTextTrack } from '../../../types';
import {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
  syncTextTrackModes,
} from '../text-track-slots';

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

describe('addSubtitlesTracksToMedia', () => {
  it('appends one <track> child per model track, tagged with data-src-track', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [
      makeModelTrack({ id: 'track-en', language: 'en' }),
      makeModelTrack({ id: 'track-es', label: 'Spanish', language: 'es' }),
    ]);

    const tracks = Array.from(media.children) as HTMLTrackElement[];
    expect(tracks.length).toBe(2);
    expect(tracks[0]!.tagName).toBe('TRACK');
    expect(tracks[0]!.id).toBe('track-en');
    expect(tracks[0]!.kind).toBe('subtitles');
    expect(tracks[0]!.label).toBe('English');
    expect(tracks[0]!.srclang).toBe('en');
    expect(tracks[0]!.hasAttribute('data-src-track')).toBe(true);
    expect(tracks[1]!.id).toBe('track-es');
    expect(tracks[1]!.srclang).toBe('es');
    expect(tracks[1]!.hasAttribute('data-src-track')).toBe(true);
  });

  it('marks elements as default when the model is default', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [makeModelTrack({ default: true })]);

    expect((media.children[0] as HTMLTrackElement).default).toBe(true);
  });

  it('omits srclang when the model has no language', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [makeModelTrack({ language: undefined })]);

    expect((media.children[0] as HTMLTrackElement).srclang).toBe('');
  });

  it('is a no-op when given an empty array', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, []);

    expect(media.children.length).toBe(0);
  });
});

describe('getShowingSubtitlesTrackFromMedia', () => {
  it('returns the SPF-owned subtitle track currently in showing mode', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [
      makeModelTrack({ id: 'track-en', language: 'en' }),
      makeModelTrack({ id: 'track-es', label: 'Spanish', language: 'es' }),
    ]);
    (media.children[1] as HTMLTrackElement).track.mode = 'showing';

    const showing = getShowingSubtitlesTrackFromMedia(media);
    expect(showing?.id).toBe('track-es');
  });

  it('returns undefined when no SPF-owned track is showing', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [makeModelTrack()]);

    expect(getShowingSubtitlesTrackFromMedia(media)).toBeUndefined();
  });

  it('ignores host-page-owned <track> children even when they are showing', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [makeModelTrack({ id: 'spf-track' })]);

    const hostTrack = document.createElement('track');
    hostTrack.id = 'host-track';
    hostTrack.kind = 'subtitles';
    hostTrack.src = 'data:text/vtt,';
    media.appendChild(hostTrack);
    hostTrack.track.mode = 'showing';

    expect(getShowingSubtitlesTrackFromMedia(media)).toBeUndefined();
  });

  it('ignores non-subtitle/caption kinds even when SPF-tagged', () => {
    const media = document.createElement('video');
    const el = document.createElement('track');
    el.id = 'chapters';
    el.kind = 'chapters';
    el.src = 'data:text/vtt,';
    el.toggleAttribute('data-src-track', true);
    media.appendChild(el);
    el.track.mode = 'showing';

    expect(getShowingSubtitlesTrackFromMedia(media)).toBeUndefined();
  });
});

describe('removeAllSubtitlesTracksFromMedia', () => {
  it('removes every SPF-owned <track> child', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [
      makeModelTrack({ id: 'track-en' }),
      makeModelTrack({ id: 'track-es', label: 'Spanish', language: 'es' }),
    ]);
    expect(media.children.length).toBe(2);

    removeAllSubtitlesTracksFromMedia(media);
    expect(media.children.length).toBe(0);
  });

  it('leaves host-page-owned <track> children in place', () => {
    const media = document.createElement('video');
    addSubtitlesTracksToMedia(media, [makeModelTrack()]);

    const hostTrack = document.createElement('track');
    hostTrack.id = 'host-track';
    hostTrack.kind = 'subtitles';
    hostTrack.src = 'data:text/vtt,';
    media.appendChild(hostTrack);

    removeAllSubtitlesTracksFromMedia(media);

    expect(media.children.length).toBe(1);
    expect((media.children[0] as HTMLTrackElement).id).toBe('host-track');
  });

  it('is a no-op when no SPF-owned tracks are attached', () => {
    const media = document.createElement('video');
    removeAllSubtitlesTracksFromMedia(media);
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
