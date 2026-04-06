import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import type { HlsEngineHost } from './preload';

/**
 * Ensures user-authored metadata and chapters `<track>` elements stay loaded
 * when hls.js is active.
 *
 * hls.js forcibly clears all cues from text tracks on manifest loads and media
 * attaches. This mixin re-enables those tracks by forcing `mode = 'hidden'`
 * and reloading the track source when cues have been wiped.
 */
export function HlsJsMediaMetadataTracksMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaMetadataTracks extends (BaseClass as Constructor<HlsEngineHost>) {
    constructor(...args: any[]) {
      super(...args);

      // Watch out here, AFTER the manifest is loaded!
      this.engine?.on(Hls.Events.MANIFEST_LOADED, () => this.#forceHiddenTracks());
      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#forceHiddenTracks());
    }

    #forceHiddenTracks(): void {
      const { target } = this;
      if (!target) return;

      [...target.textTracks].forEach((track) => {
        if (!(track.kind === 'metadata' || track.kind === 'chapters')) return;

        let selector = 'track';
        if (track.kind) selector += `[kind="${track.kind}"]`;
        if (track.label) selector += `[label="${track.label}"]`;

        const trackEl = target.querySelector(selector) as HTMLTrackElement | null;
        if (!trackEl) return;

        const src = trackEl.getAttribute('src') ?? '';
        const TRACK_LOADED = 2;

        // Only reset the track if it was loaded before and had no cues.
        if (src && trackEl.readyState === TRACK_LOADED && !track.cues?.length) {
          const newTrackEl = target.replaceChild(trackEl.cloneNode(), trackEl);

          if (newTrackEl?.default && newTrackEl.track.mode !== 'hidden') {
            newTrackEl.track.mode = 'hidden';
          }
        }
      });
    }
  }

  return HlsJsMediaMetadataTracks as unknown as Base;
}
