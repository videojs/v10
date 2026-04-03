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
    #disconnect: AbortController | null = null;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#destroy());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#destroy());
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
    }

    #init(): void {
      this.#disconnect?.abort();
      this.#disconnect = new AbortController();

      this.#forceHiddenTracks();
    }

    #forceHiddenTracks(): void {
      const { engine, target } = this;
      if (!engine || !target) return;

      Array.from(target.textTracks).forEach((track) => {
        if (!(track.kind === 'metadata' || track.kind === 'chapters')) return;

        if (!track.cues?.length) {
          let selector = 'track';
          if (track.kind) selector += `[kind="${track.kind}"]`;
          if (track.label) selector += `[label="${track.label}"]`;
          const trackEl = target.querySelector(selector);
          const src = trackEl?.getAttribute('src') ?? '';
          trackEl?.removeAttribute('src');
          setTimeout(() => {
            trackEl?.setAttribute('src', src);
          }, 0);
        }

        if (track.mode !== 'hidden') {
          track.mode = 'hidden';
        }
      });
    }
  }

  return HlsJsMediaMetadataTracks as unknown as Base;
}
