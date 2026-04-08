import type { AnyConstructor, MixinReturn } from '@videojs/utils/types';
import { update } from '../../core/signals/primitives';
import type { PlaybackEngineConfig } from './engine';
import { createPlaybackEngine, type PlaybackEngine } from './engine';

export interface SpfMediaProps {
  readonly engine: PlaybackEngine;
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  attach(target: EventTarget): void;
  detach(): void;
  play(): Promise<void>;
  destroy(): void;
}

/**
 * Mixin that adds SPF playback engine capabilities to any base class.
 *
 * Use this to compose SPF into a class hierarchy (e.g., with VideoProxy
 * or CustomVideoElement) instead of using the standalone `SpfMedia` class.
 */
export function SpfMediaMixin<Base extends AnyConstructor<any>>(BaseClass: Base) {
  class SpfMediaImpl extends (BaseClass as AnyConstructor<any>) {
    #engine: PlaybackEngine;
    #config: PlaybackEngineConfig;
    #preload: '' | 'none' | 'metadata' | 'auto' = '';
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);
      this.#config = {};
      this.#engine = createPlaybackEngine({});
    }

    get engine(): PlaybackEngine {
      return this.#engine;
    }

    // ---------------------------------------------------------------------------
    // Media element lifecycle
    // ---------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      update(this.#engine.owners, { mediaElement });
      (super.attach as any)?.(mediaElement);
    }

    detach(): void {
      this.#cancelPendingPlay();
      update(this.#engine.owners, { mediaElement: undefined });
      (super.detach as any)?.();
    }

    destroy(): void {
      this.#cancelPendingPlay();
      this.#engine.destroy();
    }

    // ---------------------------------------------------------------------------
    // preload — synchronous IDL attribute (WHATWG §4.8.11.2)
    // ---------------------------------------------------------------------------

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

    // ---------------------------------------------------------------------------
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // Each assignment destroys the current engine and starts a fresh one, exactly
    // as the browser's load algorithm resets all media element state on src change.
    // ---------------------------------------------------------------------------

    get src(): string {
      return this.#engine.state.get().presentation?.url ?? '';
    }

    set src(value: string) {
      const prevMediaElement = this.#engine.owners.get().mediaElement;

      this.#cancelPendingPlay();
      this.#engine.destroy();
      this.#engine = createPlaybackEngine(this.#config);

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

    // ---------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // ---------------------------------------------------------------------------

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

    // ---------------------------------------------------------------------------
    // Private
    // ---------------------------------------------------------------------------

    #cancelPendingPlay(): void {
      if (!this.#loadstartListener) return;
      const { mediaElement } = this.#engine.owners.get();
      mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
      this.#loadstartListener = null;
    }
  }

  return SpfMediaImpl as unknown as MixinReturn<Base, SpfMediaProps>;
}

/**
 * HTMLMediaElement-compatible adapter for the SPF playback engine.
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
 * const media = new SpfMedia({ preferredAudioLanguage: 'en' });
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 *
 * // Change source — old engine is destroyed, new one starts clean:
 * media.src = 'https://stream.mux.com/xyz456.m3u8';
 *
 * // Explicit teardown:
 * media.destroy();
 */
export class SpfMedia extends SpfMediaMixin(EventTarget) {}
