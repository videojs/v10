import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  createLiveHlsEngine,
  type LiveHlsEngineConfig,
  type LiveHlsEngineContext,
  type LiveHlsEngineSignals,
  type LiveHlsEngineState,
} from './engine';

export interface LiveHlsMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
}

export const liveHlsMediaDefaultProps: LiveHlsMediaProps = {
  src: '',
  preload: '',
};

export interface LiveHlsMediaAPI extends LiveHlsMediaProps {
  readonly engine: Composition<LiveHlsEngineState, LiveHlsEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Adapter mixin for the live HLS engine — mirrors `SimpleHlsMediaMixin`,
 * swapping in `createLiveHlsEngine`. Implements the WHATWG `src`/`preload`/
 * `play()` contract so the live engine drops into anywhere a media element is
 * expected. A fresh engine is created on each `src` assignment (full teardown
 * of the prior source); the attached media element is preserved across changes.
 *
 * Distinct from the VoD adapter (rather than a shared parameterized mixin)
 * while the live engine stabilizes.
 */
export function LiveHlsMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class LiveHlsMediaImpl extends BaseClass {
    #engine: Composition<LiveHlsEngineState, LiveHlsEngineContext>;
    #config: LiveHlsEngineConfig;
    #signals!: LiveHlsEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = liveHlsMediaDefaultProps.preload;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();
    }

    get engine(): Composition<LiveHlsEngineState, LiveHlsEngineContext> {
      return this.#engine;
    }

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

    get preload(): '' | 'none' | 'metadata' | 'auto' {
      return this.#preload;
    }

    set preload(value: '' | 'none' | 'metadata' | 'auto') {
      this.#preload = value;
      if (value) {
        this.#signals.state.preload.set(value);
      }
    }

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

    play(): Promise<void> {
      const mediaElement = this.#signals.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('LiveHlsMediaElement: no media element attached'));
      }

      // Signal play intent — enables loading even with preload="none".
      this.#signals.state.loadActivated.set(true);

      return mediaElement.play().catch((err: unknown) => {
        // The rejection may be because MSE hasn't attached a blob URL yet. Wait
        // for loadstart (src assigned by MSE setup) and retry once.
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

    #createEngine(): Composition<LiveHlsEngineState, LiveHlsEngineContext> {
      return createLiveHlsEngine({
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

  return LiveHlsMediaImpl as unknown as MixinReturn<Base, LiveHlsMediaAPI>;
}

/** Standalone live SPF media adapter with no base class. */
export class LiveHlsMediaElement extends LiveHlsMediaMixin(class {}) {}
