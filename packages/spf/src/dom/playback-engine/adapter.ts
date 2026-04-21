import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../core/composition/engine';
import { update } from '../../core/signals/primitives';
import {
  createHlsPlaybackEngine,
  type HlsPlaybackEngineConfig,
  type HlsPlaybackEngineOwners,
  type HlsPlaybackEngineState,
} from './hls-engine';

export interface SpfMediaAPI {
  readonly engine: Composition<HlsPlaybackEngineState, HlsPlaybackEngineOwners>;
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds SPF playback engine behavior to any base class.
 *
 * Implements the src/play() contract per the WHATWG HTML spec so that SPF can
 * be used anywhere a media element API is expected.
 *
 * A new engine is created on every src assignment — this fully tears down all
 * state, SourceBuffers, and in-flight requests from the previous source before
 * the next one begins. The media element reference is preserved across src
 * changes and re-applied to the new engine automatically.
 *
 * @example
 * class SimpleHlsMedia extends SpfMediaMixin(HTMLVideoElementHost) {}
 *
 * const media = new SimpleHlsMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 */
export function SpfMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class SpfMediaImpl extends BaseClass {
    #engine: Composition<HlsPlaybackEngineState, HlsPlaybackEngineOwners>;
    #config: HlsPlaybackEngineConfig;
    #preload: '' | 'none' | 'metadata' | 'auto' = '';

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = createHlsPlaybackEngine(config);
    }

    get engine(): Composition<HlsPlaybackEngineState, HlsPlaybackEngineOwners> {
      return this.#engine;
    }

    // -------------------------------------------------------------------------
    // Media element lifecycle
    // -------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      super.attach?.(mediaElement);
      update(this.#engine.owners, { mediaElement });
    }

    detach(): void {
      this.#cancelPendingPlay();
      update(this.#engine.owners, { mediaElement: undefined });
      super.detach?.();
    }

    destroy(): void {
      this.#cancelPendingPlay();
      this.#engine.destroy();
    }

    // -------------------------------------------------------------------------
    // preload — synchronous IDL attribute (WHATWG §4.8.11.2)
    // -------------------------------------------------------------------------

    get preload(): '' | 'none' | 'metadata' | 'auto' {
      return this.#preload;
    }

    set preload(value: '' | 'none' | 'metadata' | 'auto') {
      this.#preload = value;
      if (value) {
        update(this.#engine.state, { preload: value });
      }
      // value = '' clears #preload (so the next engine recreation won't re-apply
      // an explicit value) but does not patch current state — the existing preload
      // stays in effect until the next src change creates a fresh engine.
    }

    // -------------------------------------------------------------------------
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // Each assignment destroys the current engine and starts a fresh one, exactly
    // as the browser's load algorithm resets all media element state on src change.
    // -------------------------------------------------------------------------

    get src(): string {
      return this.#engine.state.get().presentation?.url ?? '';
    }

    set src(value: string) {
      const prevMediaElement = this.#engine.owners.get().mediaElement;

      this.#cancelPendingPlay();
      this.#engine.destroy();
      this.#engine = createHlsPlaybackEngine(this.#config);

      // Apply explicit preload before setting owners so syncPreloadAttribute skips
      // element inference and the explicit value is preserved across src changes.
      if (this.#preload) {
        update(this.#engine.state, { preload: this.#preload });
      }

      if (prevMediaElement) {
        update(this.#engine.owners, { mediaElement: prevMediaElement });
      }

      if (value) {
        update(this.#engine.state, { presentation: { url: value } });
      }
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // -------------------------------------------------------------------------

    play(): Promise<void> {
      const { mediaElement } = this.#engine.owners.get();
      if (!mediaElement) {
        return Promise.reject(new Error('SpfMedia: no media element attached'));
      }

      // Signal play intent — enables loading even with preload="none"
      update(this.#engine.state, { playbackInitiated: true });

      return mediaElement.play().catch((err: unknown) => {
        // If we have a pending HLS source, the rejection may be because MSE
        // hasn't attached a blob URL yet. Wait for loadstart (src assigned
        // by MSE setup) and retry once.
        if (this.src) {
          return new Promise<void>((resolve, reject) => {
            const listener = () => {
              this.#loadstartListener = null;
              mediaElement.play().then(resolve, reject);
            };
            this.#loadstartListener = listener;
            mediaElement.addEventListener('loadstart', listener, { once: true });
          });
        }
        throw err;
      });
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    #cancelPendingPlay(): void {
      if (!this.#loadstartListener) return;
      const { mediaElement } = this.#engine.owners.get();
      mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
      this.#loadstartListener = null;
    }
  }

  return SpfMediaImpl as unknown as MixinReturn<Base, SpfMediaAPI>;
}

/** Standalone SPF media adapter with no base class. */
export class SpfMedia extends SpfMediaMixin(class {}) {}
