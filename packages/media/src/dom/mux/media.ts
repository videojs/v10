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

    const { type, preferPlayback, hlsJs, nativeHls } = this.#source ?? {};
    const source: MuxSource = {
      ...(type && { type }),
      ...(preferPlayback && { preferPlayback }),
      ...(hlsJs && { hlsJs }),
      ...(nativeHls && { nativeHls }),
      ...(parseMuxVideoURL(value) ?? (value ? { src: value } : null)),
    };

    this.source = Object.keys(source).length > 0 ? source : null;
  }

  /**
   * Structured Mux source. Setting it derives `src` from the playback ID,
   * custom domain, and `playback` params (appended as `snake_case` query
   * params). A `playback.token` replaces all other params — signed URLs bake
   * them into the token. Engine options live under `hlsJs` and `nativeHls`.
   *
   * A `drm.token` fills in both: `hlsJs.drmSystems` and `nativeHls.drmSystems`
   * get Mux's FairPlay, Widevine, and PlayReady license servers for this
   * playback ID, so protected media plays whichever path the browser takes.
   * Naming either yourself overrides that, for content Mux does not license.
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
      ...withMuxDrm(source),
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
 * Fold Mux's derived license servers into both engine configurations, switching
 * EME on so hls.js listens for `encrypted`. Which engine ends up playing is
 * decided later, and a signed Mux source should play either way.
 *
 * The same `drmSystems` object serves both: native HLS takes the hls.js shape
 * and reads the FairPlay entry out of it, ignoring the systems only MSE can
 * negotiate.
 *
 * Whatever the caller set wins, key by key, so license servers of their own
 * replace the derived ones.
 */
function withMuxDrm(source: MuxSource): Pick<MuxSource, 'hlsJs' | 'nativeHls'> {
  const drmSystems = createMuxDrmSystems(source);
  if (!drmSystems) return { hlsJs: source.hlsJs, nativeHls: source.nativeHls };

  return {
    hlsJs: { emeEnabled: true, drmSystems, ...source.hlsJs },
    nativeHls: { drmSystems, ...source.nativeHls },
  };
}
