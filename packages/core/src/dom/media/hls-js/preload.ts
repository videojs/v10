import Hls from 'hls.js';
import { defineExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { MediaPreloadType } from '../../../core/media/types';
import type { HTMLMediaElementHost } from '../html-media-element-host';
import { HTMLMediaElementLayer } from '../html-media-element-layer';

export type HlsJsPreloadMedia = HTMLMediaElementHost<HTMLMediaElement, any> & {
  engine?: Hls | null;
};

/**
 * Maps the host's `preload` value to hls.js `startLoad` / buffer-limit
 * configuration:
 *
 * - `'auto'` or already playing → full buffer limits, immediate start.
 * - `'metadata'` → minimal buffer (1 byte / 1 second), full load deferred to `play`.
 * - `'none'` / `''` → no start, full load deferred to `play`.
 *
 * Re-applies on `MANIFEST_LOADING` / `MEDIA_ATTACHED` and tears down on
 * `MEDIA_DETACHED` / `DESTROYING`.
 *
 * @example hlsJsPreload().install(media);
 */
export class HlsJsPreload {
  readonly name = 'hls-js-preload';

  install(media: HlsJsPreloadMedia) {
    const { engine } = media;
    if (!engine) return;

    const mediaLayer = new HlsJsPreloadLayer(media);
    const removeLayer = addLayer(media, mediaLayer);

    const init = () => mediaLayer.init();
    const reset = () => mediaLayer.reset();

    engine.on(Hls.Events.MANIFEST_LOADING, init);
    engine.on(Hls.Events.MEDIA_ATTACHED, init);
    engine.on(Hls.Events.MEDIA_DETACHED, reset);
    engine.on(Hls.Events.DESTROYING, reset);

    return () => {
      reset();
      engine.off(Hls.Events.MANIFEST_LOADING, init);
      engine.off(Hls.Events.MEDIA_ATTACHED, init);
      engine.off(Hls.Events.MEDIA_DETACHED, reset);
      engine.off(Hls.Events.DESTROYING, reset);
      removeLayer();
    };
  }
}

export const hlsJsPreload = defineExtension<void, HlsJsPreloadMedia, HlsJsPreload>(() => new HlsJsPreload());

class HlsJsPreloadLayer extends HTMLMediaElementLayer {
  #media: HlsJsPreloadMedia;
  #preload: MediaPreloadType = 'metadata';
  #preloadAbort: AbortController | null = null;
  #defaultMaxBufferLength: number | undefined;
  #defaultMaxBufferSize: number | undefined;

  constructor(media: HlsJsPreloadMedia) {
    super();
    this.#media = media;
  }

  override get preload(): MediaPreloadType {
    return this.#preload;
  }

  override set preload(value: MediaPreloadType) {
    this.#preload = value;
    this.init();
  }

  init() {
    this.#preloadAbort?.abort();

    const { target, engine } = this.#media;
    if (!target) return;

    // Sync stored preload to the native element (may have been set before attach).
    if (target.preload !== this.#preload) target.preload = this.#preload;

    if (!engine) return;

    this.#defaultMaxBufferLength ??= engine.config.maxBufferLength;
    this.#defaultMaxBufferSize ??= engine.config.maxBufferSize;

    const defaultLength = this.#defaultMaxBufferLength;
    const defaultSize = this.#defaultMaxBufferSize;

    const startLoad = (length?: number, size?: number) => {
      if (!engine) return;
      engine.config.maxBufferLength = length ?? defaultLength;
      engine.config.maxBufferSize = size ?? defaultSize;
      if (engine.loadingEnabled) return;
      engine.startLoad();
    };

    if (this.#preload === 'auto' || !target.paused) {
      startLoad();
      return;
    }

    if (this.#preload === 'metadata') startLoad(1, 1);

    this.#preloadAbort = new AbortController();
    target.addEventListener('play', () => startLoad(), {
      signal: this.#preloadAbort.signal,
      once: true,
    });
  }

  reset() {
    this.#preloadAbort?.abort();
    this.#preloadAbort = null;
  }
}
