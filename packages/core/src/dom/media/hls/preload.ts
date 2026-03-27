import type { Constructor } from '@videojs/utils/types';
import type Hls from 'hls.js';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

interface HlsPreloadHost {
  readonly engine: Hls | null;
  readonly target: EventTarget | null | undefined;
  load?(): void;
  attach?(target: EventTarget): void;
  detach?(): void;
  destroy?(): void;
  destroyEngine?(): void;
}

/**
 * Manages HLS preload behavior by mapping the media element's `preload`
 * attribute to hls.js `startLoad` / buffer-limit configuration.
 *
 * - `'auto'` or already playing → full buffer limits, immediate start.
 * - `'metadata'` → minimal buffer (1 byte / 1 second), deferred full load on play.
 * - `'none'` / `''` → no start, deferred full load on play.
 */
export function HlsMediaPreloadMixin<Base extends Constructor<HlsPreloadHost>>(BaseClass: Base) {
  class HlsMediaPreload extends (BaseClass as Constructor<HlsPreloadHost>) {
    #preloadAbort?: AbortController;
    #defaultMaxBufferLength: number | undefined;
    #defaultMaxBufferSize: number | undefined;

    get preload(): PreloadType {
      return (this.target as HTMLMediaElement | null)?.preload || 'metadata';
    }

    set preload(value: PreloadType) {
      const target = this.target as HTMLMediaElement | null;
      if (!target || target.preload === value) return;
      target.preload = value;
      this.#updatePreload();
    }

    load(): void {
      super.load?.();
      this.#updatePreload();
    }

    attach(target: EventTarget): void {
      super.attach?.(target);
      this.#updatePreload();
    }

    destroyEngine(): void {
      this.#preloadAbort?.abort();
      super.destroyEngine?.();
    }

    detach(): void {
      this.#preloadAbort?.abort();
      super.detach?.();
    }

    #updatePreload(): void {
      this.#preloadAbort?.abort();

      const target = this.target as HTMLMediaElement | null;
      const { engine } = this;
      if (!target || !engine) return;

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

  return HlsMediaPreload as unknown as Base;
}
