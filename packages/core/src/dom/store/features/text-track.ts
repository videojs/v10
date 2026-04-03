import { findTrackElement, getTextTrackList, listen } from '@videojs/utils/dom';

import type { MediaTextCue, MediaTextTrack, MediaTextTrackState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const textTrackFeature = definePlayerFeature({
  name: 'textTrack',
  state: ({ target }): MediaTextTrackState => ({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList: [],
    subtitlesShowing: false,
    toggleSubtitles(forceShow?: boolean) {
      const subtitlesTracks = getTextTrackList(
        target().media,
        (track) => track.kind === 'subtitles' || track.kind === 'captions'
      );

      if (!subtitlesTracks.length) return false;

      const showing = subtitlesTracks.some((track: TextTrack) => track.mode === 'showing');
      const nextShowing = forceShow ?? !showing;

      for (const track of subtitlesTracks) {
        track.mode = nextShowing ? 'showing' : 'disabled';
      }

      return nextShowing;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    let trackCleanup: AbortController | null = null;

    function sync() {
      trackCleanup?.abort();
      trackCleanup = new AbortController();

      let chaptersTrack: TextTrack | null = null;
      let thumbnailTrack: TextTrack | null = null;
      const textTrackList: MediaTextTrack<TextTrackKind>[] = [];
      let subtitlesShowing = false;

      for (let i = 0; i < media.textTracks.length; i++) {
        const track = media.textTracks[i]!;
        if (!chaptersTrack && track.kind === 'chapters') chaptersTrack = track;
        if (!thumbnailTrack && track.kind === 'metadata' && track.label === 'thumbnails') thumbnailTrack = track;

        textTrackList.push({
          kind: track.kind,
          label: track.label,
          language: track.language,
          mode: track.mode,
        });

        if ((track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing') {
          subtitlesShowing = true;
        }
      }

      // Browsers don't auto-load cues for metadata/chapters tracks even with
      // the `default` attribute — mode stays 'disabled' until explicitly set.
      if (chaptersTrack && chaptersTrack.mode === 'disabled') chaptersTrack.mode = 'hidden';
      if (thumbnailTrack && thumbnailTrack.mode === 'disabled') thumbnailTrack.mode = 'hidden';

      // VTTCue extends TextTrackCue with `text` — cast via `unknown` since
      // the CueList is typed as TextTrackCue which doesn't expose `text`.
      const chaptersCues: MediaTextCue[] = chaptersTrack?.cues
        ? (Array.from(chaptersTrack.cues) as unknown as MediaTextCue[])
        : [];
      const thumbnailCues: MediaTextCue[] = thumbnailTrack?.cues
        ? (Array.from(thumbnailTrack.cues) as unknown as MediaTextCue[])
        : [];

      let thumbnailTrackSrc: string | null = null;
      if (thumbnailTrack) {
        const el = findTrackElement(media, thumbnailTrack);
        thumbnailTrackSrc = el?.src ?? null;
      }

      // Listen for <track> load events on tracks that don't have cues yet.
      // `addtrack` fires before cues are parsed — we need the `load` event
      // on the <track> element to know when cues are ready.
      for (const trackEl of media.querySelectorAll?.('track') ?? []) {
        if (!trackEl.track?.cues?.length) {
          listen(trackEl, 'load', sync, { signal: trackCleanup.signal });
        }
      }

      set({ chaptersCues, thumbnailCues, thumbnailTrackSrc, textTrackList, subtitlesShowing });
    }

    sync();

    listen(media.textTracks, 'addtrack', sync, { signal });
    listen(media.textTracks, 'removetrack', sync, { signal });
    listen(media.textTracks, 'change', sync, { signal });
    listen(media, 'loadstart', sync, { signal });

    signal.addEventListener('abort', () => trackCleanup?.abort(), { once: true });
  },
});
