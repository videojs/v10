import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import {
  maxResolutionToPixelArea,
  pickTrackUnderPixelArea,
  type TrackPicker,
} from '../../../media/primitives/select-tracks';
import type { VideoSelectionSet } from '../../../media/types';
import {
  type BackgroundLoopingVideoEngineConfig,
  type BackgroundLoopingVideoEngineContext,
  type BackgroundLoopingVideoEngineSignals,
  type BackgroundLoopingVideoEngineState,
  createBackgroundLoopingVideoEngine,
} from './engine';

export interface BackgroundLoopingVideoMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  loop: boolean;
  muted: boolean;
  autoplay: boolean;
  maxResolution: string | number | undefined;
}

export const backgroundLoopingVideoMediaDefaultProps: BackgroundLoopingVideoMediaProps = {
  src: '',
  preload: 'auto',
  loop: true,
  muted: true,
  autoplay: true,
  maxResolution: undefined,
};

export interface BackgroundLoopingVideoMediaAPI extends BackgroundLoopingVideoMediaProps {
  readonly engine: Composition<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds the background-looping-video SPF playback engine to any
 * base class.
 *
 * Implements the WHATWG HTML media element contract (`src`, `preload`,
 * `loop`, `muted`, `autoplay`, `play()`) so it can be dropped in anywhere a
 * media element API is expected. Compared to `SimpleHlsMediaMixin`, this
 * variant:
 *
 * - exposes `loop`, `muted`, and `autoplay` as adapter-owned native
 *   passthroughs, all defaulting to `true` — the use case is silent
 *   autoplay-looping video, so muted + autoplay satisfy browser autoplay
 *   policies and loop is the defining behavior;
 * - drives the underlying engine with the background-looping-video
 *   composition (single-rendition, video-only, autoplay-from-construction).
 *
 * A new engine is created on every src assignment — this fully tears down
 * all state, SourceBuffers, and in-flight requests from the previous
 * source before the next one begins. The media element reference is
 * preserved across src changes and re-applied to the new engine
 * automatically.
 *
 * @example
 * class BackgroundLoopingVideoMedia extends BackgroundLoopingVideoMediaMixin(HTMLVideoElementHost) {}
 *
 * const media = new BackgroundLoopingVideoMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 * media.play();
 */
export function BackgroundLoopingVideoMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class BackgroundLoopingVideoMediaImpl extends BaseClass {
    #engine: Composition<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext>;
    #config: BackgroundLoopingVideoEngineConfig;
    #signals!: BackgroundLoopingVideoEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = backgroundLoopingVideoMediaDefaultProps.preload;
    #loop: boolean = backgroundLoopingVideoMediaDefaultProps.loop;
    #muted: boolean = backgroundLoopingVideoMediaDefaultProps.muted;
    #autoplay: boolean = backgroundLoopingVideoMediaDefaultProps.autoplay;
    #maxResolution: string | number | undefined;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;

      this.#maxResolution = config?.maxResolution;
      this.#engine = this.#createEngine();
    }

    get engine(): Composition<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext> {
      return this.#engine;
    }

    // -------------------------------------------------------------------------
    // Media element lifecycle
    // -------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      super.attach?.(mediaElement);
      // Apply adapter-owned native props before the engine takes over —
      // the underlying element needs `loop` / `muted` / `autoplay` set for
      // the use case's autoplay-looping semantics.
      mediaElement.loop = this.#loop;
      mediaElement.muted = this.#muted;
      mediaElement.autoplay = this.#autoplay;

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

    set preload(_value: '' | 'none' | 'metadata' | 'auto') {
      // Noop for this phase
    }

    // -------------------------------------------------------------------------
    // loop / muted / autoplay — adapter-owned IDL attributes mirrored onto
    // the attached media element. The engine itself has no opinion on any
    // of them.
    // -------------------------------------------------------------------------

    get loop(): boolean {
      return this.#loop;
    }

    set loop(_value: boolean) {
      // Noop for this phase
    }

    get muted(): boolean {
      return this.#muted;
    }

    set muted(_value: boolean) {
      // Noop for this phase
    }

    get autoplay(): boolean {
      return this.#autoplay;
    }

    set autoplay(_value: boolean) {
      // Noop for this phase
    }

    // -------------------------------------------------------------------------
    // maxResolution — adapter-owned cap on the picked rendition. The engine's
    // closure picker (see `#createEngine`) reads this field at pick time, so
    // setter writes take effect on the next `presentation-resolved` transition
    // without an engine rebuild.
    // -------------------------------------------------------------------------

    get maxResolution(): string | number | undefined {
      return this.#maxResolution;
    }

    /**
     * Set the cap. Accepts `"720p"` / `"1080p"` etc., a bare number
     * (interpreted as pixel area), or `undefined` to clear. Unrecognized
     * values are treated as no cap.
     */
    set maxResolution(value: string | number | undefined) {
      if (value === this.#maxResolution) return;
      this.#maxResolution = value;
    }

    // -------------------------------------------------------------------------
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // Each assignment destroys the current engine and starts a fresh one,
    // matching the browser's load algorithm reset on src change.
    // -------------------------------------------------------------------------

    get src(): string {
      return this.#signals.state.presentation.get()?.url ?? '';
    }

    set src(value: string) {
      this.#cancelPendingPlay();

      if (value) {
        this.#signals.state.presentation.set({ url: value });
      } else {
        this.#signals.state.presentation.set(undefined);
      }
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // -------------------------------------------------------------------------

    async play(): Promise<void> {
      const mediaElement = this.#signals.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('BackgroundLoopingVideoMediaElement: no media element attached'));
      }

      try {
        return await mediaElement.play();
      } catch (err) {
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
      }
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    #createEngine(): Composition<BackgroundLoopingVideoEngineState, BackgroundLoopingVideoEngineContext> {
      const adapterPicker: TrackPicker = (presentation) => {
        const videoSet = presentation.selectionSets?.find((s) => s.type === 'video') as VideoSelectionSet | undefined;
        const tracks = videoSet?.switchingSets[0]?.tracks ?? [];
        return pickTrackUnderPixelArea(tracks, maxResolutionToPixelArea(this.#maxResolution))?.id;
      };

      return createBackgroundLoopingVideoEngine({
        picker: adapterPicker,
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

  return BackgroundLoopingVideoMediaImpl as unknown as MixinReturn<Base, BackgroundLoopingVideoMediaAPI>;
}

/** Standalone SPF background-looping-video adapter with no base class. */
export class BackgroundLoopingVideoMediaElement extends BackgroundLoopingVideoMediaMixin(class {}) {}
