import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  createHlsAudioOnlyEngine,
  type SimpleHlsAudioOnlyEngineConfig,
  type SimpleHlsAudioOnlyEngineContext,
  type SimpleHlsAudioOnlyEngineSignals,
  type SimpleHlsAudioOnlyEngineState,
} from './engine-audio-only';

export interface SimpleHlsAudioOnlyMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
}

export const simpleHlsAudioOnlyMediaDefaultProps: SimpleHlsAudioOnlyMediaProps = {
  src: '',
  preload: '',
};

export interface SimpleHlsAudioOnlyMediaAPI extends SimpleHlsAudioOnlyMediaProps {
  readonly engine: Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds SPF audio-only HLS playback to any base class.
 *
 * Parallel to `SimpleHlsMediaMixin` with one substantive difference: the
 * underlying engine is the audio-only variant (`createHlsAudioOnlyEngine`),
 * which omits video and text-track behaviors. The src / preload / play()
 * contract per the WHATWG HTML spec is identical to the default adapter.
 *
 * Selecting this adapter is the variant decision: instantiating
 * `SimpleHlsAudioOnlyMediaElement` opts the consumer into audio-only
 * delivery even when the source is a mixed-AV HLS manifest.
 *
 * @example
 * class SimpleHlsAudioOnlyMedia extends SimpleHlsAudioOnlyMediaMixin(HTMLVideoElementHost) {}
 *
 * const media = new SimpleHlsAudioOnlyMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 */
export function SimpleHlsAudioOnlyMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class SimpleHlsAudioOnlyMediaImpl extends BaseClass {
    #engine: Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>;
    #config: SimpleHlsAudioOnlyEngineConfig;
    #signals!: SimpleHlsAudioOnlyEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = simpleHlsAudioOnlyMediaDefaultProps.preload;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();
    }

    get engine(): Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext> {
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
        return Promise.reject(new Error('SimpleHlsAudioOnlyMediaElement: no media element attached'));
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

    #createEngine(): Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext> {
      return createHlsAudioOnlyEngine({
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

  return SimpleHlsAudioOnlyMediaImpl as unknown as MixinReturn<Base, SimpleHlsAudioOnlyMediaAPI>;
}

/** Standalone SPF audio-only media adapter with no base class. */
export class SimpleHlsAudioOnlyMediaElement extends SimpleHlsAudioOnlyMediaMixin(class {}) {}
