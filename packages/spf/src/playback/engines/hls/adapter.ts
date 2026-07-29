import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  createSimpleHlsEngine,
  type SimpleHlsEngineConfig,
  type SimpleHlsEngineContext,
  type SimpleHlsEngineSignals,
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
 * A single engine instance is created at construction and recycled across src
 * changes.
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
    readonly #engine: Composition<SimpleHlsEngineState, SimpleHlsEngineContext>;
    #config: SimpleHlsEngineConfig;
    #signals!: SimpleHlsEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = simpleHlsMediaDefaultProps.preload;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();
    }

    /**
     * Underlying playback engine — the low-level SPF reactive composition that
     * drives playback. An advanced escape hatch for direct engine access;
     * normal playback is driven through this element's own properties and
     * methods.
     */
    get engine(): Composition<SimpleHlsEngineState, SimpleHlsEngineContext> {
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

    /** Preload type (`'none'` / `'metadata'` / `'auto'`). */
    get preload(): '' | 'none' | 'metadata' | 'auto' {
      return this.#preload;
    }

    set preload(value: '' | 'none' | 'metadata' | 'auto') {
      this.#preload = value;
      if (value) {
        this.#signals.state.preload.set(value);
      }
      // value = '' resets the IDL mirror (so `get preload` reflects '') but does
      // not patch state — the engine keeps its current preload until an explicit
      // W3C value replaces it.
    }

    // -------------------------------------------------------------------------
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // Each assignment overwrites the engine's presentation state in place. The
    // resolver FSM routes back through teardown → rebuild on the same engine,
    // mirroring how the browser's load algorithm resets media state on src change
    // — without recreating the engine or re-capturing its signals. Setting an
    // empty src un-resolves the presentation, tearing the current source down to
    // the engine's fresh-but-attached "no source" state.
    // -------------------------------------------------------------------------

    get src(): string {
      return this.#signals.state.presentation.get()?.url ?? '';
    }

    set src(value: string) {
      this.#cancelPendingPlay();
      this.#signals.state.presentation.set(value ? { url: value } : undefined);
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // -------------------------------------------------------------------------

    play(): Promise<void> {
      const mediaElement = this.#signals.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('SimpleHlsMediaElement: no media element attached'));
      }

      // Signal play intent — enables loading even with preload="none"
      this.#signals.state.loadActivated.set(true);

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

    #createEngine(): Composition<SimpleHlsEngineState, SimpleHlsEngineContext> {
      return createSimpleHlsEngine({
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

  return SimpleHlsMediaImpl as unknown as MixinReturn<Base, SimpleHlsMediaAPI>;
}

/** Standalone SPF media adapter with no base class. */
export class SimpleHlsMediaElement extends SimpleHlsMediaMixin(class {}) {}
