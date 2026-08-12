import { MuxVideo } from '../../../media/mux-video/spf-media';
import { safeDefine } from '../../safe-define';

const PRIMARY_TAG = 'mux-video';
const FALLBACK_TAG = 'mux-video-spf';

/**
 * `<mux-video>` unless that tag is already taken.
 *
 * Both Mux flavors are the same element with a different engine underneath, so
 * each claims the same tag and the import path is what chooses. Having both in
 * one runtime is the exception — it means two Mux engines in one bundle — so this
 * one steps aside to `<mux-video-spf>` rather than losing the registration
 * silently, which is what `safeDefine` would otherwise do.
 *
 * Whichever flavor is imported second is the one that yields, so the tag a given
 * import lands on depends on load order when both are present.
 */
function resolveTagName(): typeof PRIMARY_TAG | typeof FALLBACK_TAG {
  if (!globalThis.customElements?.get(PRIMARY_TAG)) return PRIMARY_TAG;

  if (__DEV__) {
    console.warn(
      `[${FALLBACK_TAG}] <${PRIMARY_TAG}> is already registered, so the SPF-backed element registered as <${FALLBACK_TAG}> instead. ` +
        `Importing both '@videojs/html/media/mux-video' and '@videojs/html/media/mux-video/spf' puts two Mux engines in one runtime. ` +
        `Use <${FALLBACK_TAG}> for the SPF-backed one, or import only the flavor you need.`
    );
  }

  return FALLBACK_TAG;
}

export class MuxVideoElement extends MuxVideo {
  static readonly tagName = resolveTagName();
}

safeDefine(MuxVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    // Only the fallback is declared: `mux-video` is already mapped to the
    // hls.js-backed element, and an interface can't merge two types for one key.
    'mux-video-spf': MuxVideoElement;
  }
}
