import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import { pickTrackUnderPixelArea, type TrackPicker } from '../../../media/primitives/select-tracks';
import type { VideoSelectionSet } from '../../../media/types';
import {
  type BackgroundVideoEngineConfig,
  type BackgroundVideoEngineContext,
  type BackgroundVideoEngineSignals,
  type BackgroundVideoEngineState,
  createBackgroundVideoEngine,
} from '../../engines/hls/engine-background-video';

export interface HlsBackgroundVideoMediaProps {
  src: string;
}

export const hlsBackgroundVideoMediaDefaultProps: HlsBackgroundVideoMediaProps = {
  src: '',
};

export interface HlsBackgroundVideoMediaAPI extends HlsBackgroundVideoMediaProps {
  readonly engine: Composition<BackgroundVideoEngineState, BackgroundVideoEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds the background-video SPF playback engine to any base class,
 * for an HLS URL.
 *
 * `src` is the whole surface, and the picker always pins the top rendition on
 * offer. There is no cap of its own because the manifest is the better place to
 * narrow one: a delivery param — `?max_resolution=720p` on a Mux stream URL, for
 * one — keeps the renditions it excludes out of the manifest entirely, rather
 * than fetched-then-unpicked. Deriving a cap from the screen instead is on the
 * roadmap, and lands here when it does.
 *
 * `@videojs/spf/mux-background-video` is this same Media under a Mux-flavored
 * name — an alias, not a variant. Nothing about the surface changes with the
 * import path.
 *
 * Everything else the use case fixes rather than exposes: video-only, looping,
 * muted, autoplaying, loading as soon as there is a source. `attach` writes that
 * onto the element and nothing here declares `loop` / `muted` / `autoplay` /
 * `preload` of its own — a host-bound Media inherits all four from the host
 * already, and shadowing them with fixed values would only make reads describe
 * an intention rather than what the element is doing.
 *
 * A new src re-resolves the presentation, tearing down the state, SourceBuffers,
 * and in-flight requests the previous one built before the next begins. The
 * engine instance and the attached media element are both kept, so neither has to
 * be rewired.
 *
 * @example
 * class HlsBackgroundVideoMedia extends HlsBackgroundVideoMediaMixin(BackgroundVideoHost) {}
 *
 * const media = new HlsBackgroundVideoMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/PLAYBACK_ID.m3u8?max_resolution=720p';
 * media.play();
 */
export function HlsBackgroundVideoMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class HlsBackgroundVideoMediaImpl extends BaseClass {
    #engine: Composition<BackgroundVideoEngineState, BackgroundVideoEngineContext>;
    #config: BackgroundVideoEngineConfig;
    #signals!: BackgroundVideoEngineSignals;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();
    }

    get engine(): Composition<BackgroundVideoEngineState, BackgroundVideoEngineContext> {
      return this.#engine;
    }

    // -------------------------------------------------------------------------
    // Media element lifecycle
    // -------------------------------------------------------------------------

    attach(mediaElement: HTMLMediaElement): void {
      super.attach?.(mediaElement);
      // The one place the fixed behavior is stated. Muted and autoplay are what
      // let it start without a gesture, loop is the defining behavior, and
      // `preload` says out loud what the engine does regardless — it subtracts
      // preload monitoring and loads from the moment it has a source.
      mediaElement.loop = true;
      mediaElement.muted = true;
      mediaElement.autoplay = true;
      mediaElement.preload = 'auto';

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
    // src — synchronous IDL attribute (WHATWG §4.8.11.2)
    // -------------------------------------------------------------------------

    get src(): string {
      return this.#signals.state.presentation.get()?.url ?? '';
    }

    set src(value: string) {
      // Same line the HLS Medias draw: the presentation is set from a fresh
      // object every time, so re-resolving a URL already playing would restart
      // it for no reason.
      if (value === this.src) return;

      this.#cancelPendingPlay();
      this.#signals.state.presentation.set(value ? { url: value } : undefined);
    }

    // -------------------------------------------------------------------------
    // play() — WHATWG §4.8.11.8
    // Delegates to the attached media element's native play().
    // -------------------------------------------------------------------------

    async play(): Promise<void> {
      const mediaElement = this.#signals.context.mediaElement.get();
      if (!mediaElement) {
        return Promise.reject(new Error('HlsBackgroundVideoMediaElement: no media element attached'));
      }

      try {
        return await mediaElement.play();
      } catch (err) {
        // If we have a pending HLS source, the rejection may be because MSE
        // hasn't attached a blob URL yet. Wait for loadstart (src assigned by
        // MSE setup) and retry once.
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

    #createEngine(): Composition<BackgroundVideoEngineState, BackgroundVideoEngineContext> {
      // No cap to apply, so the pick is whichever rendition is largest. Passing
      // no maximum is what makes that the answer, rather than a rule of its own.
      const adapterPicker: TrackPicker = (presentation) => {
        const videoSet = presentation.selectionSets?.find((s) => s.type === 'video') as VideoSelectionSet | undefined;
        const tracks = videoSet?.switchingSets[0]?.tracks ?? [];
        return pickTrackUnderPixelArea(tracks)?.id;
      };

      return createBackgroundVideoEngine({
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

  return HlsBackgroundVideoMediaImpl as unknown as MixinReturn<Base, HlsBackgroundVideoMediaAPI>;
}

/** Standalone SPF background-video adapter with no base class. */
export class HlsBackgroundVideoMediaElement extends HlsBackgroundVideoMediaMixin(class {}) {}
