import { HlsJsMedia, type HlsSource } from '../hls-js';
import { createMuxDrmSystems } from './drm';
import {
  createMuxPosterURL,
  createMuxStoryboardURL,
  createMuxVideoURL,
  type MuxContentData,
  type MuxDrmParams,
  type MuxSourceBase,
  parseMuxVideoURL,
} from './source';

/**
 * Structured Mux source for the hls.js-backed Media: Mux identity and params
 * from {@link MuxSourceBase}, plus everything the HLS layer takes — `type`,
 * `preferPlayback`, and its `engine` config.
 */
export interface MuxSource extends HlsSource, MuxSourceBase {
  /**
   * The inherited license servers, or a Mux license `token` to derive them from.
   * Redeclared because both halves name `drm`, and Mux's is the wider of the two.
   */
  drm?: MuxDrmParams | undefined;
}

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
   * A `drm.token` fills in `drm` itself: Mux's FairPlay, Widevine, and
   * PlayReady license servers for this playback ID, so protected media plays
   * whichever path the browser takes. License servers named alongside the token
   * win, key by key, for content Mux does not license.
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
  get contentData(): MuxContentData {
    const poster = createMuxPosterURL(this.source);
    const storyboard = createMuxStoryboardURL(this.source);

    return {
      ...(poster && { poster }),
      ...(storyboard && { storyboard }),
    };
  }
}

/**
 * Resolve Mux's DRM authoring input into the license servers the HLS layer
 * licenses from. Which engine ends up playing is decided later, and both read
 * `drm`, so a signed Mux source plays either way.
 *
 * `token` is Mux's own input and stops here — it names no license server, and a
 * key system is what everything downstream expects to find. Servers the caller
 * named win, key by key, so their own licensing replaces the derived URLs.
 */
function withMuxDrm(source: MuxSource): Pick<HlsSource, 'drm'> {
  const { token: _token, ...systems } = source.drm ?? {};
  const drm = { ...createMuxDrmSystems(source), ...systems };

  return { drm: Object.keys(drm).length > 0 ? drm : undefined };
}
