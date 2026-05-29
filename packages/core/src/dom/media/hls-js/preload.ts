import Hls from 'hls.js';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { MediaPreloadType } from '../../../core/media/types';
import { HTMLMediaElementLayer } from '../html-media-element-layer';
import type { HTMLVideoElementHost } from '../html-video-element-host';

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
class HlsJsPreload implements MediaExtension {
  #destroy: () => void = () => {};

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    const uninstall = installExtension(hlsJsPreload, media, this);

    const layer = new HlsJsPreloadLayer(media);
    const removeLayer = addLayer(media, layer);

    const init = () => layer.init();
    const reset = () => layer.reset();

    engine.on(Hls.Events.MANIFEST_LOADING, init);
    engine.on(Hls.Events.MEDIA_ATTACHED, init);
    engine.on(Hls.Events.MEDIA_DETACHED, reset);
    engine.on(Hls.Events.DESTROYING, reset);

    this.#destroy = () => {
      uninstall();
      reset();
      engine.off(Hls.Events.MANIFEST_LOADING, init);
      engine.off(Hls.Events.MEDIA_ATTACHED, init);
      engine.off(Hls.Events.MEDIA_DETACHED, reset);
      engine.off(Hls.Events.DESTROYING, reset);
      removeLayer();
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

export function hlsJsPreload() {
  return new HlsJsPreload();
}

class HlsJsPreloadLayer extends HTMLMediaElementLayer {
  #media: HTMLVideoElementHost<Hls>;
  #preload: MediaPreloadType = 'metadata';
  #preloadAbort: AbortController | null = null;
  #defaultMaxBufferLength: number | undefined;
  #defaultMaxBufferSize: number | undefined;

  constructor(media: HTMLVideoElementHost<Hls>) {
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
