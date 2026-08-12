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
 *
 * Finding `expected` under the tag means this module is running against its own
 * registration, so it stays on the primary tag and lets `safeDefine` no-op rather
 * than claiming a second tag for the same element. Class identity only reaches
 * that far: a second copy of this module brings its own class and still reads as
 * another flavor.
 */
function resolveTagName(expected: CustomElementConstructor): typeof PRIMARY_TAG | typeof FALLBACK_TAG {
  const registered = globalThis.customElements?.get(PRIMARY_TAG);
  if (!registered || registered === expected) return PRIMARY_TAG;

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
  static readonly tagName: typeof PRIMARY_TAG | typeof FALLBACK_TAG = resolveTagName(MuxVideoElement);
}

safeDefine(MuxVideoElement);

declare global {
  /**
   * The Mux video flavors in the build, keyed by engine.
   *
   * Each flavor's define entry adds its own key, so `<mux-video>` types as the
   * flavor that was imported, or as the union of both when both were — matching
   * the runtime, where load order decides which one holds the tag. Merging the
   * tag itself can't express that: an interface takes one type per key, and
   * TypeScript can't ask which other entries a build pulled in.
   */
  interface MuxVideoFlavors {
    spf: MuxVideoElement;
  }

  interface HTMLElementTagNameMap {
    [PRIMARY_TAG]: MuxVideoFlavors[keyof MuxVideoFlavors];
    // The fallback registration is conditional, so the tag resolves to `never`
    // unless the flavor it steps aside for is in the build too.
    [FALLBACK_TAG]: 'hlsjs' extends keyof MuxVideoFlavors ? MuxVideoElement : never;
  }
}
