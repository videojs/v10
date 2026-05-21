import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  createAudioOnlyHlsEngine,
  type SimpleAudioOnlyHlsEngineConfig,
  type SimpleAudioOnlyHlsEngineContext,
  type SimpleAudioOnlyHlsEngineSignals,
  type SimpleAudioOnlyHlsEngineState,
} from './engine-audio-only';

export interface SimpleAudioOnlyHlsMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
}

export const simpleAudioOnlyHlsMediaDefaultProps: SimpleAudioOnlyHlsMediaProps = {
  src: '',
  preload: '',
};

export interface SimpleAudioOnlyHlsMediaAPI extends SimpleAudioOnlyHlsMediaProps {
  readonly engine: Composition<SimpleAudioOnlyHlsEngineState, SimpleAudioOnlyHlsEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds SPF audio-only HLS playback to any base class.
 *
 * Parallel to `SimpleHlsMediaMixin` with one substantive difference: the
 * underlying engine is the audio-only variant (`createAudioOnlyHlsEngine`),
 * which omits video and text-track behaviors. The src / preload / play()
 * contract per the WHATWG HTML spec is identical to the default adapter.
 *
 * Selecting this adapter is the variant decision: instantiating
 * `SimpleAudioOnlyHlsMediaElement` opts the consumer into audio-only
 * delivery even when the source is a mixed-AV HLS manifest.
 *
 * @example
 * class SimpleAudioOnlyHlsMedia extends SimpleAudioOnlyHlsMediaMixin(HTMLVideoElementHost) {}
 *
 * const media = new SimpleAudioOnlyHlsMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 */
export function SimpleAudioOnlyHlsMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class SimpleAudioOnlyHlsMediaImpl extends BaseClass {
    #engine: Composition<SimpleAudioOnlyHlsEngineState, SimpleAudioOnlyHlsEngineContext>;
    #config: SimpleAudioOnlyHlsEngineConfig;
    #signals!: SimpleAudioOnlyHlsEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = simpleAudioOnlyHlsMediaDefaultProps.preload;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();
    }

    get engine(): Composition<SimpleAudioOnlyHlsEngineState, SimpleAudioOnlyHlsEngineContext> {
      return this.#engine;
    }

    // -------------------------------------------------------------------------
    // Media element lifecycle
    // -------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      super.attach?.(mediaElement);
      this.#signals.context.mediaElement.set(mediaElement);
    }

    detach(): void {
      this.#cancelPendingPlay();
      this.#signals.context.mediaElement.set(undefined);
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
        this.#signals.state.preload.set(value);
      }
    }

    // -------------------------------------------------------------------------
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // -------------------------------------------------------------------------

    get src(): string {
      return this.#signals.state.presentation.get()?.url ?? '';
    }

    set src(value: string) {
      const prevMediaElement = this.#signals.context.mediaElement.get();

      this.#cancelPendingPlay();
      this.#engine.destroy();
      this.#engine = this.#createEngine();

      if (this.#preload) {
        this.#signals.state.preload.set(this.#preload);
      }

      if (prevMediaElement) {
        this.#signals.context.mediaElement.set(prevMediaElement);
      }

      if (value) {
        this.#signals.state.presentation.set({ url: value });
      }
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // -------------------------------------------------------------------------

    play(): Promise<void> {
      const mediaElement = this.#signals.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('SimpleAudioOnlyHlsMediaElement: no media element attached'));
      }

      this.#signals.state.loadActivated.set(true);

      return mediaElement.play().catch((err: unknown) => {
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

    #createEngine(): Composition<SimpleAudioOnlyHlsEngineState, SimpleAudioOnlyHlsEngineContext> {
      return createAudioOnlyHlsEngine({
        ...this.#config,
        onSignalsReady: (signals) => {
          this.#signals = signals;
        },
      });
    }

    #cancelPendingPlay(): void {
      if (!this.#loadstartListener) return;
      const mediaElement = this.#signals.context.mediaElement.get();
      mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
      this.#loadstartListener = null;
    }
  }

  return SimpleAudioOnlyHlsMediaImpl as unknown as MixinReturn<Base, SimpleAudioOnlyHlsMediaAPI>;
}

/** Standalone SPF audio-only media adapter with no base class. */
export class SimpleAudioOnlyHlsMediaElement extends SimpleAudioOnlyHlsMediaMixin(class {}) {}
