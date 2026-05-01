import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  createSimpleHlsEngine,
  type SimpleHlsEngineConfig,
  type SimpleHlsEngineContext,
  type SimpleHlsEngineState,
} from './engine';

export interface SimpleHlsMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
}

export const simpleHlsMediaDefaultProps: SimpleHlsMediaProps = {
  src: '',
  preload: '',
};

export interface SimpleHlsMediaAPI extends SimpleHlsMediaProps {
  readonly engine: Composition<SimpleHlsEngineState, SimpleHlsEngineContext>;
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
 * class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
 *
 * const media = new SimpleHlsMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 */
export function SimpleHlsMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class SimpleHlsMediaImpl extends BaseClass {
    #engine: Composition<SimpleHlsEngineState, SimpleHlsEngineContext>;
    #config: SimpleHlsEngineConfig;
    #preload: '' | 'none' | 'metadata' | 'auto' = simpleHlsMediaDefaultProps.preload;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = createSimpleHlsEngine(config);
    }

    get engine(): Composition<SimpleHlsEngineState, SimpleHlsEngineContext> {
      return this.#engine;
    }

    // -------------------------------------------------------------------------
    // Media element lifecycle
    // -------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      super.attach?.(mediaElement);
      this.#engine.context.mediaElement.set(mediaElement);
    }

    detach(): void {
      this.#cancelPendingPlay();
      this.#engine.context.mediaElement.set(undefined);
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
        this.#engine.state.preload.set(value);
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
      return this.#engine.state.presentation.get()?.url ?? '';
    }

    set src(value: string) {
      const prevMediaElement = this.#engine.context.mediaElement.get();

      this.#cancelPendingPlay();
      this.#engine.destroy();
      this.#engine = createSimpleHlsEngine(this.#config);

      // Apply explicit preload before setting context so syncPreloadAttribute skips
      // element inference and the explicit value is preserved across src changes.
      if (this.#preload) {
        this.#engine.state.preload.set(this.#preload);
      }

      if (prevMediaElement) {
        this.#engine.context.mediaElement.set(prevMediaElement);
      }

      if (value) {
        this.#engine.state.presentation.set({ url: value });
      }
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // -------------------------------------------------------------------------

    play(): Promise<void> {
      const mediaElement = this.#engine.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('SimpleHlsMediaElement: no media element attached'));
      }

      // Signal play intent — enables loading even with preload="none"
      this.#engine.state.playbackInitiated.set(true);

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
      const mediaElement = this.#engine.context.mediaElement.get();
      mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
      this.#loadstartListener = null;
    }
  }

  return SimpleHlsMediaImpl as unknown as MixinReturn<Base, SimpleHlsMediaAPI>;
}

/** Standalone SPF media adapter with no base class. */
export class SimpleHlsMediaElement extends SimpleHlsMediaMixin(class {}) {}
