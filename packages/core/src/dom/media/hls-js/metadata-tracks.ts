import Hls from 'hls.js';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import type { HTMLVideoElementHost } from '../html-video-element-host';

/**
 * Keeps default metadata/chapters `<track>` elements alive across hls.js
 * manifest loads and media attaches, which clear text-track cues: forces
 * affected tracks back to `mode = 'hidden'` and re-clones the `<track>` when
 * its cues are wiped.
 *
 * @example hlsJsMetadataTracks().install(media);
 */
class HlsJsMetadataTracks implements MediaExtension {
  #destroy: () => void = () => {};

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    const uninstall = installExtension(hlsJsMetadataTracks, media, this);

    const onReload = () => forceHiddenTracks(media.target);

    // Re-apply once the manifest has finished loading (and on attach).
    engine.on(Hls.Events.MANIFEST_LOADED, onReload);
    engine.on(Hls.Events.MEDIA_ATTACHED, onReload);

    this.#destroy = () => {
      uninstall();
      engine.off(Hls.Events.MANIFEST_LOADED, onReload);
      engine.off(Hls.Events.MEDIA_ATTACHED, onReload);
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

export function hlsJsMetadataTracks() {
  return new HlsJsMetadataTracks();
}

const TRACK_LOADED = 2;

function forceHiddenTracks(target: HTMLMediaElement | null) {
  if (!target) return;

  for (const track of target.textTracks) {
    if (!(track.kind === 'metadata' || track.kind === 'chapters')) continue;

    let selector = 'track';
    if (track.kind) selector += `[kind="${track.kind}"]`;
    if (track.label) selector += `[label="${track.label}"]`;

    const trackEl = target.querySelector<HTMLTrackElement>(selector);
    if (!trackEl) continue;

    const src = trackEl.getAttribute('src') ?? '';

    // Only reset the track if it was loaded before and had no cues.
    if (src && trackEl.readyState === TRACK_LOADED && !track.cues?.length) {
      const clonedTrackEl = trackEl.cloneNode() as HTMLTrackElement;
      target.replaceChild(clonedTrackEl, trackEl);
    }

    // Force mode to 'hidden' for default tracks (independent of replacement).
    const currentTrackEl = target.querySelector<HTMLTrackElement>(selector);
    if (currentTrackEl?.default && currentTrackEl.track.mode !== 'hidden') {
      currentTrackEl.track.mode = 'hidden';
    }
  }
}
