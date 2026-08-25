import type { AnyConstructor, Constructor } from '@videojs/utils/types';

/**
 * What this mixin needs from whichever Mux Media the element hosts.
 *
 * Structural on purpose: the hls.js-backed `MuxMedia` and the SPF-backed `MuxAudioMedia` satisfy it identically, and
 * `src` is the WHATWG surface rather than anything engine-specific, so the element itself has no engine.
 */
interface MuxAudioHost {
  readonly src: string;
  addEventListener(type: string, listener: () => void): void;
}

interface MuxAudioElementLike extends HTMLElement {
  readonly host: MuxAudioHost;
}

/**
 * The Mux-specific element behavior for audio, over any Mux Media: reflecting the derived `src` back to the attribute.
 *
 * Much thinner than {@link MuxVideoMixin} because the rest of what that one does has no meaning here — Mux publishes no
 * poster or storyboard for an audio-only asset, and an `<audio>` element renders neither.
 *
 * A mixin rather than a base class for the same reason as the video one: each flavor's element is built on a different
 * `CustomMediaElement`, so there is no common class to extend, only a common host contract.
 */
export function MuxAudioMixin<Class extends AnyConstructor<HTMLElement>>(BaseClass: Class): Class {
  class MuxAudioElement extends (BaseClass as unknown as Constructor<MuxAudioElementLike>) {
    constructor(...args: any[]) {
      super(...args);
      // Covers both the `src` attribute and the `source` property (JS-only).
      this.host.addEventListener('sourcechange', () => this.#reflectSrc());
    }

    // Mirrors the host `src` to the `src` attribute so it matches the active playback URL.
    #reflectSrc() {
      const src = this.host.src;

      if (src) {
        if (this.getAttribute('src') !== src) this.setAttribute('src', src);
      } else if (this.hasAttribute('src')) {
        this.removeAttribute('src');
      }
    }
  }

  return MuxAudioElement as unknown as Class;
}
