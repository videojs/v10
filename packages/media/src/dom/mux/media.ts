import { HlsJsMedia } from '../hls-js';
import {
  createMuxDrmSystems,
  createMuxPosterURL,
  createMuxStoryboardURL,
  createMuxVideoURL,
  type MuxSource,
  parseMuxVideoURL,
} from './utils';

export interface MuxMediaProps {
  src: string;
  source: MuxSource | null;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  src: '',
  source: null,
};

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by parsing a new `src`. Read `source` for the new value.
 */
export class MuxMedia extends HlsJsMedia implements MuxMediaProps {
  #source: MuxSource | null = muxMediaDefaultProps.source;

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
    // A URL already describing the current source leaves it alone. `<mux-video>`
    // reflects the derived `src` back to the host, and re-deriving would drop the
    // params a Mux URL does not carry, such as `poster`.
    if (super.src === value) return;

    const { type, preferPlayback, engine } = this.#source ?? {};
    const source: MuxSource = {
      ...(type && { type }),
      ...(preferPlayback && { preferPlayback }),
      ...(engine && { engine }),
      ...(parseMuxVideoURL(value) ?? (value ? { src: value } : null)),
    };

    this.source = Object.keys(source).length > 0 ? source : null;
  }

  /**
   * Structured Mux source. Setting it derives `src` from the playback ID,
   * custom domain, and `playback` params (appended as `snake_case` query
   * params). A `playback.token` replaces all other params — signed URLs bake
   * them into the token. Engine options live under `engine`.
   *
   * A `drm.token` fills in the inherited `engine.drmSystems` with Mux's
   * FairPlay, Widevine, and PlayReady license servers for this playback ID.
   * Naming `engine.drmSystems` yourself overrides that, for content Mux does
   * not license.
   */
  get source(): MuxSource | null {
    return this.#source;
  }

  set source(value: MuxSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    this.#source = source;

    // Hand the same source down with `src` and the DRM license servers resolved
    // from the playback ID. The base keeps `src` in step, decides whether
    // playback has to reload, and dispatches `sourcechange`.
    super.source = source && {
      ...source,
      src: createMuxVideoURL(source) ?? source.src ?? '',
      engine: withMuxDrm(source),
    };
  }

  /**
   * Image URLs `source` describes rather than plays: `poster` from its `poster`
   * params, `storyboard` from its `storyboard` params. A key is absent when the
   * URL can't be built — no playback ID, or signed playback without a matching
   * image token.
   *
   * Read-only and re-derived on read, so read it again after `sourcechange`.
   * Nothing here is applied for you, apart from the thumbnail track
   * `<mux-video>` adds from `storyboard` (and drops for live streams).
   */
  get contentData(): Record<string, string> {
    const poster = createMuxPosterURL(this.source);
    const storyboard = createMuxStoryboardURL(this.source);

    return {
      ...(poster && { poster }),
      ...(storyboard && { storyboard }),
    };
  }
}

/**
 * Fold Mux's derived license servers into the engine config, switching EME on
 * so hls.js listens for `encrypted`. Whatever the caller set under `engine`
 * wins, key by key, so `drmSystems` of their own replaces the derived set.
 */
function withMuxDrm(source: MuxSource): MuxSource['engine'] {
  const drmSystems = createMuxDrmSystems(source);
  if (!drmSystems) return source.engine;

  return { emeEnabled: true, drmSystems, ...source.engine };
}
