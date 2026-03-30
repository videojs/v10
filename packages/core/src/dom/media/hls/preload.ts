import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';

export interface HlsEngineHost {
  readonly engine: Hls | null;
  readonly target: HTMLMediaElement | null;
}

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

/**
 * Manages HLS preload behavior by mapping the media element's `preload`
 * attribute to hls.js `startLoad` / buffer-limit configuration.
 *
 * - `'auto'` or already playing → full buffer limits, immediate start.
 * - `'metadata'` → minimal buffer (1 byte / 1 second), deferred full load on play.
 * - `'none'` / `''` → no start, deferred full load on play.
 */
export function HlsMediaPreloadMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsMediaPreload extends (BaseClass as Constructor<HlsEngineHost>) {
    #preloadAbort: AbortController | null = null;
    #preload: PreloadType = 'metadata';
    #defaultMaxBufferLength: number | undefined;
    #defaultMaxBufferSize: number | undefined;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#destroy());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#destroy());
    }

    get preload(): PreloadType {
      return this.#preload;
    }

    set preload(value: PreloadType) {
      this.#preload = value;
      this.#init();
    }

    #destroy(): void {
      this.#preloadAbort?.abort();
      this.#preloadAbort = null;
    }

    #init(): void {
      this.#preloadAbort?.abort();

      const target = this.target as HTMLMediaElement | null;
      if (!target) return;

      // Sync stored preload to the native element (may have been set before attach)
      if (target.preload !== this.preload) {
        target.preload = this.preload;
      }

      const { engine } = this;
      if (!engine) return;

      this.#defaultMaxBufferLength ??= engine.config.maxBufferLength;
      this.#defaultMaxBufferSize ??= engine.config.maxBufferSize;

      const defaultLength = this.#defaultMaxBufferLength;
      const defaultSize = this.#defaultMaxBufferSize;

      const startLoad = (length?: number, size?: number) => {
        const { engine } = this;
        if (!engine) return;
        engine.config.maxBufferLength = length ?? defaultLength;
        engine.config.maxBufferSize = size ?? defaultSize;
        engine.startLoad();
      };

      if (this.preload === 'auto' || !target.paused) {
        startLoad();
        return;
      }

      if (this.preload === 'metadata') {
        startLoad(1, 1);
      }

      this.#preloadAbort = new AbortController();
      target.addEventListener('play', () => startLoad(), {
        signal: this.#preloadAbort.signal,
        once: true,
      });
    }
  }

  return HlsMediaPreload as unknown as Base & Constructor<{ preload: PreloadType }>;
}
