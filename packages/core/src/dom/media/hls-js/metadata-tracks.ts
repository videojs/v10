import Hls from 'hls.js';
import { defineExtension } from '../../../core/media/media-extension';
import type { HTMLVideoElementHost } from '../html-video-element-host';

/**
 * Keeps user-authored metadata and chapters `<track>` elements loaded across
 * hls.js manifest loads and media attaches. hls.js clears cues from text
 * tracks on those events; this extension forces affected default tracks back
 * to `mode = 'hidden'` and re-clones the `<track>` element when its cues are
 * wiped.
 *
 * @example hlsJsMetadataTracks().install(media);
 */
export class HlsJsMetadataTracks {
  readonly name = 'hls-js-metadata-tracks';

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    const onReload = () => forceHiddenTracks(media.target);

    // Watch out here, AFTER the manifest is loaded!
    engine.on(Hls.Events.MANIFEST_LOADED, onReload);
    engine.on(Hls.Events.MEDIA_ATTACHED, onReload);

    return () => {
      engine.off(Hls.Events.MANIFEST_LOADED, onReload);
      engine.off(Hls.Events.MEDIA_ATTACHED, onReload);
    };
  }
}

export const hlsJsMetadataTracks = defineExtension<void, HTMLVideoElementHost<Hls>, HlsJsMetadataTracks>(
  () => new HlsJsMetadataTracks()
);

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
