import { findTrackElement, listen } from '@videojs/utils/dom';

import type { MediaTextCue, MediaTextTrackState } from '../../../core/media/state';
import { definePlayerFeature } from '../../feature';

export const textTrackFeature = definePlayerFeature({
  state: (): MediaTextTrackState => ({
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    let trackCleanup: AbortController | null = null;

    function sync() {
      trackCleanup?.abort();
      trackCleanup = new AbortController();

      let chaptersTrack: TextTrack | null = null;
      let thumbnailTrack: TextTrack | null = null;

      for (let i = 0; i < media.textTracks.length; i++) {
        const track = media.textTracks[i]!;
        if (!chaptersTrack && track.kind === 'chapters') chaptersTrack = track;
        if (!thumbnailTrack && track.kind === 'metadata' && track.label === 'thumbnails') thumbnailTrack = track;
      }

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
      for (const trackEl of media.querySelectorAll('track')) {
        if (!trackEl.track?.cues?.length) {
          listen(trackEl, 'load', sync, { signal: trackCleanup.signal });
        }
      }

      set({ chaptersCues, thumbnailCues, thumbnailTrackSrc });
    }

    sync();

    listen(media.textTracks, 'addtrack', sync, { signal });
    listen(media.textTracks, 'removetrack', sync, { signal });
    listen(media.textTracks, 'change', sync, { signal });
    listen(media, 'loadstart', sync, { signal });

    signal.addEventListener('abort', () => trackCleanup?.abort(), { once: true });
  },
});
