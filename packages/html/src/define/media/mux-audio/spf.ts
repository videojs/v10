import { MuxAudio } from '../../../media/mux-audio/spf';
import { safeDefine } from '../../safe-define';

const PRIMARY_TAG = 'mux-audio';
const FALLBACK_TAG = 'mux-audio-spf';

/**
 * `<mux-audio>` unless that tag is already taken.
 *
 * The same rule as the SPF-backed `<mux-video>`, for the same reason — see
 * `../mux-video/spf` for why the tag is shared and why this one steps aside
 * rather than losing the registration silently.
 */
function resolveTagName(): typeof PRIMARY_TAG | typeof FALLBACK_TAG {
  if (!globalThis.customElements?.get(PRIMARY_TAG)) return PRIMARY_TAG;

  if (__DEV__) {
    console.warn(
      `[${FALLBACK_TAG}] <${PRIMARY_TAG}> is already registered, so the SPF-backed element registered as <${FALLBACK_TAG}> instead. ` +
        `Importing both '@videojs/html/media/mux-audio' and '@videojs/html/media/mux-audio/spf' puts two Mux engines in one runtime. ` +
        `Use <${FALLBACK_TAG}> for the SPF-backed one, or import only the flavor you need.`
    );
  }

  return FALLBACK_TAG;
}

export class MuxAudioElement extends MuxAudio {
  static readonly tagName = resolveTagName();
}

safeDefine(MuxAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    // Only the fallback is declared: `mux-audio` is already mapped to the
    // hls.js-backed element, and an interface can't merge two types for one key.
    'mux-audio-spf': MuxAudioElement;
  }
}
