import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_UNSUPPORTED_PLAYBACK_FEATURE,
  type SvtaError,
} from '../../../media/errors';
import { UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE } from '../../primitives/error-messages';
import {
  createHlsAudioOnlyEngine,
  type SimpleHlsAudioOnlyEngineConfig,
  type SimpleHlsAudioOnlyEngineContext,
  type SimpleHlsAudioOnlyEngineSignals,
  type SimpleHlsAudioOnlyEngineState,
} from './engine-audio-only';
import { firstFatal, hasUnsupportedFeatureCause, type SimpleHlsMediaError } from './error-surface';

export interface SimpleHlsAudioOnlyMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  disableRemotePlayback: boolean;
}

export const simpleHlsAudioOnlyMediaDefaultProps: SimpleHlsAudioOnlyMediaProps = {
  src: '',
  preload: '',
  disableRemotePlayback: false,
};

export interface SimpleHlsAudioOnlyMediaAPI extends SimpleHlsAudioOnlyMediaProps {
  readonly engine: Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>;
  readonly error: SimpleHlsMediaError | null;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * Which reported conditions this composition treats as fatal. Only the audio
 * verdict: an audio-only engine composes no video selection, so
 * `SVTA_NO_SUPPORTED_VIDEO_TRACK` is never reported and surfacing it would
 * describe a track type this media doesn't have.
 */
const FATAL_SVTA_CODES: ReadonlySet<number> = new Set<number>([SVTA_NO_SUPPORTED_AUDIO_TRACK]);

/**
 * Mixin that adds SPF audio-only HLS playback to any base class.
 *
 * @fires error - Fired when a fatal condition is reported. Read `error` for it.
 *
 * Parallel to `SimpleHlsMediaMixin` with one substantive difference: the
 * underlying engine is the audio-only variant (`createHlsAudioOnlyEngine`),
 * which omits video and text-track behaviors. The src / preload /
 * disableRemotePlayback / play() contract per the WHATWG HTML spec is identical
 * to the default adapter.
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
    readonly #engine: Composition<SimpleHlsAudioOnlyEngineState, SimpleHlsAudioOnlyEngineContext>;
    #config: SimpleHlsAudioOnlyEngineConfig;
    #signals!: SimpleHlsAudioOnlyEngineSignals;
    #preload: '' | 'none' | 'metadata' | 'auto' = simpleHlsAudioOnlyMediaDefaultProps.preload;
    #disableRemotePlayback: boolean = simpleHlsAudioOnlyMediaDefaultProps.disableRemotePlayback;
    #error: SimpleHlsMediaError | null = null;
    /** Reported condition currently surfaced — see the video adapter's note. */
    #reportedCode: number | null = null;
    #stopErrorSync: () => void;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();

      // Promote the first fatal condition out of the engine's reported sequence
      // onto the media surface. Clearing rides the same signal: `collectErrors`
      // resets the slot per source, so a new source starts with no error without
      // this needing its own source-change hook.
      this.#stopErrorSync = effect(() => {
        const errors = this.#signals.state.errors.get();
        this.#setError(firstFatal(errors, FATAL_SVTA_CODES), errors);
      });
    }

    /**
     * The current fatal error, or `null`. Only *fatal* conditions appear here —
     * the engine reports non-fatal ones too, which stay in `engine.state.errors`.
     * Resets per source. Fires `'error'` when set.
     */
    get error(): SimpleHlsMediaError | null {
      return this.#error;
    }

    #setError(reported: SvtaError | undefined, errors: readonly SvtaError[] | undefined): void {
      if (!reported) {
        // Cleared (new source). No event: `'error'` announces a failure, and
        // consumers reset their own copy on source change.
        this.#error = null;
        this.#reportedCode = null;
        return;
      }
      // Keyed on the code, not the object: a later append re-runs this effect
      // with an equal-but-new array, and re-firing `'error'` for a condition
      // already surfaced would look like a second failure.
      if (this.#reportedCode === reported.code) return;
      this.#reportedCode = reported.code;

      // See the video adapter: a cause this engine can't implement is what the
      // consumer needs, so it replaces the verdict's code on the surface.
      const unsupported = hasUnsupportedFeatureCause(errors);
      if (unsupported) {
        console.error(UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE, { conditions: errors });
      }

      this.#error = {
        code: unsupported ? SVTA_UNSUPPORTED_PLAYBACK_FEATURE : reported.code,
        message: reported.message ?? '',
        ...(reported.data === undefined ? {} : { data: reported.data }),
      };
      this.dispatchEvent?.(new Event('error'));
    }

    /**
     * Underlying playback engine — the low-level SPF reactive composition that
     * drives playback. An advanced escape hatch for direct engine access;
     * normal playback is driven through this element's own properties and
     * methods.
     */
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
      this.#stopErrorSync();
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
    }

    // -------------------------------------------------------------------------
    // disableRemotePlayback — synchronous IDL attribute (WHATWG Remote Playback)
    // Author intent for whether the AirPlay/remote picker is offered. Mirrors
    // the DOM attribute name; the value flows to `state.disableRemotePlayback`,
    // which `setupAirPlay` reads to honor an explicit opt-out. The underlying
    // media element's own `disableRemotePlayback` stays programmatically managed
    // (ManagedMediaSource needs it `true` to open; AirPlay flips it `false` once
    // the source is open), so author intent and the effective flag stay distinct.
    // -------------------------------------------------------------------------

    get disableRemotePlayback(): boolean {
      return this.#disableRemotePlayback;
    }

    set disableRemotePlayback(value: boolean) {
      this.#disableRemotePlayback = value;
      this.#signals.state.disableRemotePlayback.set(value);
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
