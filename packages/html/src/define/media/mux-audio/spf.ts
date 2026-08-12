import { MuxAudio } from '../../../media/mux-audio/spf-media';
import { safeDefine } from '../../safe-define';

const PRIMARY_TAG = 'mux-audio';
const FALLBACK_TAG = 'mux-audio-spf';

/**
 * `<mux-audio>` unless that tag is already taken.
 *
 * The same rule as the SPF-backed `<mux-video>`, for the same reason — see
 * `../mux-video/spf` for why the tag is shared, why this one steps aside rather
 * than losing the registration silently, and why `expected` under the tag is not
 * a reason to step aside.
 */
function resolveTagName(expected: CustomElementConstructor): typeof PRIMARY_TAG | typeof FALLBACK_TAG {
  const registered = globalThis.customElements?.get(PRIMARY_TAG);
  if (!registered || registered === expected) return PRIMARY_TAG;

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
  static readonly tagName: typeof PRIMARY_TAG | typeof FALLBACK_TAG = resolveTagName(MuxAudioElement);
}

safeDefine(MuxAudioElement);

declare global {
  /** The Mux audio flavors in the build — see `../mux-video/spf` for why. */
  interface MuxAudioFlavors {
    spf: MuxAudioElement;
  }

  interface HTMLElementTagNameMap {
    [PRIMARY_TAG]: MuxAudioFlavors[keyof MuxAudioFlavors];
    // The fallback registration is conditional, so the tag resolves to `never`
    // unless the flavor it steps aside for is in the build too.
    [FALLBACK_TAG]: 'hlsjs' extends keyof MuxAudioFlavors ? MuxAudioElement : never;
  }
}
