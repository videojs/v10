import { HlsJsMedia } from '../hls-js';
import {
  createMuxStoryboardURL,
  createMuxThumbnailURL,
  createMuxVideoURL,
  isSameMuxSource,
  type MuxSource,
  parseMuxVideoURL,
} from './utils';

export interface MuxMediaProps {
  src: string;
  source: MuxSource | null;
  thumbnail: string;
  storyboard: string;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  src: '',
  source: null,
  thumbnail: '',
  storyboard: '',
};

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by parsing a new `src`. Read `source` for the new value.
 */
export class MuxMedia extends HlsJsMedia implements MuxMediaProps {
  #source: MuxSource | null = muxMediaDefaultProps.source;
  #thumbnail = muxMediaDefaultProps.thumbnail;
  #storyboard = muxMediaDefaultProps.storyboard;

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
    const source = parseMuxVideoURL(value) ?? null;
    const changed = !isSameMuxSource(this.#source, source);
    this.#source = source;
    super.src = value;
    if (changed) this.dispatchEvent(new Event('sourcechange'));
  }

  /**
   * Structured Mux source. Setting it derives `src` from the playback ID,
   * custom domain, and `playback` params (appended as `snake_case` query
   * params). A `playback.token` replaces all other params — signed URLs bake
   * them into the token.
   */
  get source(): MuxSource | null {
    return this.#source;
  }

  set source(value: MuxSource | null) {
    if (isSameMuxSource(this.#source, value)) return;
    this.#source = value;
    const src = createMuxVideoURL(value) ?? '';
    if (super.src !== src) super.src = src;
    this.dispatchEvent(new Event('sourcechange'));
  }

  /** Thumbnail image URL. Falls back to one derived from `source`. */
  get thumbnail(): string {
    return this.#thumbnail || (createMuxThumbnailURL(this.#source) ?? '');
  }

  set thumbnail(value: string) {
    this.#thumbnail = value;
  }

  /** Storyboard (thumbnail sprite) VTT URL. Falls back to one derived from `source`. */
  get storyboard(): string {
    return this.#storyboard || (createMuxStoryboardURL(this.#source) ?? '');
  }

  set storyboard(value: string) {
    this.#storyboard = value;
  }
}
