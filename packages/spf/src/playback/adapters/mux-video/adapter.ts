import {
  createMuxPosterURL,
  createMuxStoryboardURL,
  createMuxVideoURL,
  type MuxContentData,
  type MuxSourceBase,
  parseMuxVideoURL,
} from '@videojs/media/dom/mux/source';
import type { Constructor, MixinReturn } from '@videojs/utils/types';

export interface MuxMediaProps {
  src: string;
  source: MuxSourceBase | null;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  src: '',
  source: null,
};

export interface MuxMediaAPI extends MuxMediaProps {
  readonly contentData: MuxContentData;
}

/**
 * Mux identity over any SPF Media: the structured `source`, the `src` derived
 * from it, and the image URLs it describes.
 *
 * Everything here is Mux identity, so it carries no engine and both flavors get
 * it unchanged — the video Media over the full HLS engine, the audio-only Media
 * over the subtractive one. A mixin rather than a shared base class because each
 * flavor extends a different SPF Media, so there is no common class to put this
 * on, only a common `src` accessor to write through.
 *
 * Unlike the hls.js-backed `MuxMedia`, there is no inherited `source` to
 * delegate to — the SPF Medias know only `src` — so this owns the structured
 * source and dispatches `sourcechange` itself.
 *
 * @fires sourcechange - Fired when `source` changes, either directly or by parsing a new `src`. Read `source` for the new value.
 */
export function MuxMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class MuxMediaImpl extends BaseClass {
    /**
     * Named on the error copy when this engine can't play a source: the
     * hls.js-backed Mux Media plays the MPEG-TS and DRM-protected sources that
     * SPF does not, and it backs both `<mux-video>` and `<mux-audio>`.
     *
     * Names the flavor rather than an import path, because one Media is reached
     * through three of them — `@videojs/html`, `@videojs/react`, and this package
     * — and each has a different counterpart. The flavor suffix is the one thing
     * common to the layers a consumer imports elements and components from.
     */
    static get alternativeMediaSuggestion(): string | undefined {
      return 'Try the hls.js-backed Mux media instead: import the `hls-js` flavor in place of the `spf` one.';
    }

    #source: MuxSourceBase | null = muxMediaDefaultProps.source;

    /**
     * Media source URL. Setting a Mux stream URL
     * (`https://stream.mux.com/<playback-id>.m3u8?...`) extracts the playback ID
     * and query params into `source`; other URLs are kept as a plain `source.src`.
     *
     * Only playback options carry over. Mux identity comes from the URL, and the
     * signed `poster`, `storyboard`, and `drm` tokens are scoped to a playback ID,
     * so carrying them onto a different source would build rejected URLs.
     */
    get src(): string {
      return super.src;
    }

    set src(value: string) {
      // A URL already describing the current source leaves it alone. The elements
      // reflect the derived `src` back to the host, and re-deriving would drop the
      // params a Mux URL does not carry, such as `poster`.
      if (super.src === value) return;

      this.source = parseMuxVideoURL(value) ?? (value ? { src: value } : null);
    }

    /**
     * Structured Mux source. Setting it derives `src` from the playback ID, custom
     * domain, and `playback` params (appended as `snake_case` query params). A
     * `playback.token` replaces all other params — signed URLs bake them into the
     * token.
     */
    get source(): MuxSourceBase | null {
      return this.#source;
    }

    set source(value: MuxSourceBase | null) {
      const source = value ?? null;
      // Changing anything takes a new object, so handing the same one back costs
      // nothing.
      if (source === this.#source) return;

      this.#source = source;
      super.src = (source && (createMuxVideoURL(source) ?? source.src)) || '';

      this.dispatchEvent?.(new Event('sourcechange'));
    }

    /**
     * Image URLs `source` describes rather than plays: `poster` from its `poster`
     * params, `storyboard` from its `storyboard` params.
     *
     * Read-only and re-derived on read, so read it again after `sourcechange`.
     * Nothing here is applied for you.
     */
    get contentData(): MuxContentData {
      const poster = createMuxPosterURL(this.#source);
      const storyboard = createMuxStoryboardURL(this.#source);

      return {
        ...(poster && { poster }),
        ...(storyboard && { storyboard }),
      };
    }
  }

  // `MixinReturn` sources statics from `Base`, so this mixin's own needs adding
  // back to the type or callers can't read it.
  return MuxMediaImpl as unknown as MixinReturn<Base, MuxMediaAPI> & {
    readonly alternativeMediaSuggestion: string | undefined;
  };
}
