import {
  createMuxPosterURL,
  createMuxStoryboardURL,
  createMuxVideoURL,
  type MuxContentData,
  type MuxSourceBase,
  parseMuxVideoURL,
} from '@videojs/media/dom/mux/source';
import { SimpleHlsMedia } from '../simple-hls/media';

export interface MuxMediaProps {
  src: string;
  source: MuxSourceBase | null;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  src: '',
  source: null,
};

/**
 * The Mux Media over the SPF HLS engine.
 *
 * Mirrors `@videojs/media/dom/mux`'s hls.js-backed `MuxMedia` — same class shape,
 * same `src`/`source` relationship, same derived `contentData` — over a different
 * engine. It carries no `engine` or `preferPlayback`: SPF publishes no
 * engine-shaped config for a consumer to pass, so the source is Mux identity and
 * nothing else.
 *
 * `source.drm` is accepted but inert. SPF prunes encrypted renditions and reports
 * unsupported DRM, and `alternativeMediaSuggestion` points at the hls.js-backed
 * import, so a protected source fails with copy that says where to go.
 *
 * Unlike its hls.js counterpart, there is no inherited `source` to delegate to —
 * `SimpleHlsMedia` knows only `src` — so this class owns the structured source and
 * dispatches `sourcechange` itself.
 *
 * @fires sourcechange - Fired when `source` changes, either directly or by parsing a new `src`. Read `source` for the new value.
 */
export class MuxMedia extends SimpleHlsMedia implements MuxMediaProps {
  /**
   * Named on the error copy when this engine can't play a source: the hls.js-backed
   * `<mux-video>` plays MPEG-TS and DRM-protected sources that SPF does not.
   */
  static get alternativeMediaSuggestion(): string | undefined {
    return 'Try the hls.js-backed Mux media from `@videojs/media/dom/mux` instead.';
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
