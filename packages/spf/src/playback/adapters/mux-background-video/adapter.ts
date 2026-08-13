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

export interface MuxBackgroundVideoMediaProps {
  src: string;
}

export const muxBackgroundVideoMediaDefaultProps: MuxBackgroundVideoMediaProps = {
  src: '',
};

export interface MuxBackgroundVideoMediaAPI extends MuxBackgroundVideoMediaProps {
  readonly engine: Composition<BackgroundVideoEngineState, BackgroundVideoEngineContext>;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Mixin that adds the background-video SPF playback engine to any base class,
 * for a Mux stream URL.
 *
 * `src` is the whole surface. What a consumer would otherwise reach for an
 * attribute to do — capping which rendition is fetched — is a Mux stream URL
 * param (`?max_resolution=720p`), so the cap is applied server-side and the
 * manifest never offers the renditions it excludes. This adapter therefore has
 * no cap of its own and always pins the top rendition on offer.
 *
 * Deliberately a sibling of `../background-video` rather than a layer over it.
 * They share the engine, not the adapter: that one exposes a client-side
 * `maxResolution` this one has no use for, and it binds no host. The two are
 * otherwise line-for-line the same today — **changes to one usually belong in
 * both** until the Mux flavor grows something of its own, which the screen
 * resolution and pixel-density capping on the roadmap is expected to be.
 *
 * Everything else the use case fixes rather than exposes: video-only, looping,
 * muted, autoplaying, loading as soon as there is a source. `attach` writes that
 * onto the element and nothing here declares `loop` / `muted` / `autoplay` /
 * `preload` of its own — a host-bound Media inherits all four from the host
 * already, and shadowing them with fixed values would only make reads describe
 * an intention rather than what the element is doing.
 *
 * @example
 * class MuxBackgroundVideoMedia extends MuxBackgroundVideoMediaMixin(BackgroundVideoHost) {}
 *
 * const media = new MuxBackgroundVideoMedia();
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/PLAYBACK_ID.m3u8?max_resolution=720p';
 * media.play();
 */
export function MuxBackgroundVideoMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class MuxBackgroundVideoMediaImpl extends BaseClass {
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
        return Promise.reject(new Error('MuxBackgroundVideoMediaElement: no media element attached'));
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

  return MuxBackgroundVideoMediaImpl as unknown as MixinReturn<Base, MuxBackgroundVideoMediaAPI>;
}

/** Standalone Mux background-video adapter with no base class. */
export class MuxBackgroundVideoMediaElement extends MuxBackgroundVideoMediaMixin(class {}) {}
