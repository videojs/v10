import { HlsJsMedia } from '../hls-js';
import { createMuxPosterURL, createMuxVideoURL, type MuxSource, parseMuxVideoURL } from './utils';

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
  /**
   * Build the stream URL from the playback ID, custom domain, and `playback`
   * params. Falls back to an explicit `source.src` so a non-Mux URL still plays.
   */
  static override resolveSrc(source: MuxSource | null): string {
    return createMuxVideoURL(source) ?? source?.src ?? '';
  }

  /**
   * Extract the playback ID and query params from a Mux stream URL. Non-Mux URLs
   * are kept as a plain `src`.
   *
   * Only playback options carry over. Mux identity comes from the URL, and the
   * signed `poster`, `storyboard`, and `drm` tokens are scoped to a playback
   * ID, so carrying them onto a different source would build rejected URLs.
   */
  static override resolveSource(src: string, previous: MuxSource | null): MuxSource | null {
    const { type, preferPlayback, engine } = previous ?? {};
    const source: MuxSource = {
      ...(type && { type }),
      ...(preferPlayback && { preferPlayback }),
      ...(engine && { engine }),
      ...(parseMuxVideoURL(src) ?? (src ? { src } : null)),
    };
    return Object.keys(source).length > 0 ? source : null;
  }

  /**
   * Media source URL. Setting a Mux stream URL
   * (`https://stream.mux.com/<playback-id>.m3u8?...`) extracts the playback ID
   * and query params into `source`; other URLs pass through unchanged.
   */
  get src(): string {
    return super.src;
  }

  set src(value: string) {
    if (super.src === value) return;
    super.src = value;
  }

  /**
   * Structured Mux source. Setting it derives `src` from the playback ID,
   * custom domain, and `playback` params (appended as `snake_case` query
   * params). A `playback.token` replaces all other params — signed URLs bake
   * them into the token. Engine options live under `engine`.
   */
  get source(): MuxSource | null {
    return super.source;
  }

  set source(value: MuxSource | null) {
    super.source = value;
  }

  /**
   * Poster image URL for the current content, built from `source` and its
   * `poster` params. Read-only, and never applied on its own — assign it to
   * `poster` to use it, or ignore it and set your own.
   *
   * Empty when there is no playback ID, or when signed playback has no matching
   * image token. Changes with `source`, so read it again after `sourcechange`.
   *
   * Use `createMuxPosterURL` directly to vary a modifier without touching
   * `source`, such as requesting a narrower image for a small viewport.
   */
  get contentPoster(): string {
    return createMuxPosterURL(this.source) ?? '';
  }
}
