import { describe, expect, it, vi } from 'vite-plus/test';

import type { Chapter } from '../../../hls/parse-json-chapters';
import { addChaptersTracksToMedia, removeAllChaptersTracksFromMedia } from '../chapters-track-slots';
import { addSubtitlesTracksToMedia, removeAllSubtitlesTracksFromMedia } from '../text-track-slots';

const chapters: Chapter[] = [
  { startTime: 0, endTime: 30, titles: { und: 'Intro', es: 'Introducción' } },
  { startTime: 30, endTime: 75, titles: { und: 'Middle' } },
  { startTime: 90, titles: { und: 'End', es: 'Fin' } },
];

function chaptersTracks(media: HTMLMediaElement): HTMLTrackElement[] {
  return Array.from(media.querySelectorAll<HTMLTrackElement>('track[kind="chapters"]'));
}

function cuesOf(el: HTMLTrackElement): VTTCue[] {
  // SAFETY: every cue on these tracks is a `VTTCue` added by `addChaptersTracksToMedia`.
  return Array.from(el.track.cues ?? []) as VTTCue[];
}

describe('addChaptersTracksToMedia', () => {
  it('appends one hidden chapters <track> per title language, tagged data-src-chapters-track', () => {
    // Attributes, order, and mode are synchronous; cues land once the slot settles.
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters);

    const tracks = chaptersTracks(media);

    expect(tracks.map((el) => el.srclang)).toEqual(['und', 'es']);

    for (const el of tracks) {
      expect(el.kind).toBe('chapters');
      expect(el.hasAttribute('data-src-chapters-track')).toBe(true);
      expect(el.hasAttribute('data-src-track')).toBe(false);
      expect(el.src).toBe('');
      expect(el.default).toBe(false);
      expect(el.track.mode).toBe('hidden');
    }
  });

  it('adds a cue for every chapter titled in that language once the slot has settled', async () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters, { duration: 120 });

    const [und, es] = chaptersTracks(media);

    await vi.waitFor(() => expect(cuesOf(und!)).toHaveLength(3));
    expect(cuesOf(und!).map((cue) => [cue.startTime, cue.endTime, cue.text])).toEqual([
      [0, 30, 'Intro'],
      [30, 75, 'Middle'],
      [90, 120, 'End'],
    ]);
    expect(cuesOf(es!).map((cue) => [cue.startTime, cue.endTime, cue.text])).toEqual([
      [0, 30, 'Introducción'],
      [90, 120, 'Fin'],
    ]);
  });

  it('appends the preferred language first', () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters, { preferredLanguage: 'es' });

    expect(chaptersTracks(media).map((el) => el.srclang)).toEqual(['es', 'und']);
  });

  it('falls back to und, then first-seen, when no preferred language is titled', () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters, { preferredLanguage: 'fr' });
    expect(chaptersTracks(media).map((el) => el.srclang)).toEqual(['und', 'es']);

    removeAllChaptersTracksFromMedia(media);
    addChaptersTracksToMedia(media, [{ startTime: 0, titles: { fr: 'Un', de: 'Eins' } }], { preferredLanguage: 'es' });
    expect(chaptersTracks(media).map((el) => el.srclang)).toEqual(['fr', 'de']);
  });

  it('ends an open last chapter at the duration', async () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters, { duration: 100 });

    const [und] = chaptersTracks(media);

    await vi.waitFor(() => expect(cuesOf(und!).at(-1)?.endTime).toBe(100));
  });

  it('ends an open last chapter at Number.MAX_VALUE when no finite duration is known', async () => {
    // `VTTCue` throws on a non-finite time, so an open chapter on a live
    // presentation (duration Infinity) gets the largest finite end instead.
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters);
    addChaptersTracksToMedia(media, [{ startTime: 0, titles: { fr: 'Un' } }], { duration: Number.POSITIVE_INFINITY });

    const [und, , fr] = chaptersTracks(media);

    await vi.waitFor(() => expect(cuesOf(und!).at(-1)?.endTime).toBe(Number.MAX_VALUE));
    expect(cuesOf(fr!)[0]?.endTime).toBe(Number.MAX_VALUE);
  });

  it('creates no track when no chapter carries a title', () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, [{ startTime: 0, endTime: 10, titles: {} }]);
    addChaptersTracksToMedia(media, []);

    expect(media.children.length).toBe(0);
  });

  it('fires change on the TextTrackList once the cues are in place', async () => {
    // Observers (video.js's textTrack feature) re-read `cues` on `change`; a
    // srcless `<track>` never fires `load`, so the post-fill mode change is
    // their signal.
    const media = document.createElement('video');
    const seen: number[] = [];

    media.textTracks.addEventListener('change', () => seen.push(chaptersTracks(media)[0]!.track.cues?.length ?? -1));
    addChaptersTracksToMedia(media, chapters);

    await vi.waitFor(() => expect(seen.at(-1)).toBe(3));
  });

  it('adds no cues to a slot removed before its load settled', async () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters);

    const [und] = chaptersTracks(media);

    removeAllChaptersTracksFromMedia(media);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(und!.track.cues?.length ?? 0).toBe(0);
  });
});

describe('removeAllChaptersTracksFromMedia', () => {
  it('removes every SPF-owned chapters slot and nothing else', () => {
    const media = document.createElement('video');
    const host = document.createElement('track');

    host.kind = 'chapters';
    media.appendChild(host);
    addSubtitlesTracksToMedia(media, [
      {
        id: 'subs-en',
        type: 'text',
        kind: 'subtitles',
        label: 'English',
        language: 'en',
        url: 'data:text/vtt,',
        mimeType: 'text/vtt',
        bandwidth: 0,
        groupId: 'subs',
      },
    ]);
    addChaptersTracksToMedia(media, chapters);

    expect(media.children.length).toBe(4);

    removeAllChaptersTracksFromMedia(media);

    expect(Array.from(media.children)).toEqual([host, media.querySelector('track[data-src-track]')]);
  });

  it('is left alone by the subtitle slot removal', () => {
    const media = document.createElement('video');

    addChaptersTracksToMedia(media, chapters);
    removeAllSubtitlesTracksFromMedia(media);

    expect(chaptersTracks(media).length).toBe(2);
  });
});
