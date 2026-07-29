import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { resolveLiveLatency } from '../../../media/hls/reload-policy';
import {
  deriveStreamType,
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type StreamType,
} from '../../../media/types';
import { findTrackById } from '../../../media/utils/tracks';
import { getLiveEdge, type LiveWindowState, liveTrackId } from '../../primitives/live-window';
import {
  createSimpleHlsEngine,
  type SimpleHlsEngineConfig,
  type SimpleHlsEngineContext,
  type SimpleHlsEngineSignals,
  type SimpleHlsEngineState,
} from './engine';

/**
 * The media-level stream type: the engine's detected {@link StreamType}
 * (`'live'` / `'on-demand'`) widened with `'unknown'` for "no playlist parsed
 * yet." String-compatible with `@videojs/core`'s `MediaStreamType` without a
 * cross-package dependency (spf sits below core).
 */
export type SimpleHlsMediaStreamType = StreamType | 'unknown';

export interface SimpleHlsMediaProps {
  src: string;
  preload: '' | 'none' | 'metadata' | 'auto';
  disableRemotePlayback: boolean;
  streamType: SimpleHlsMediaStreamType;
}

export const simpleHlsMediaDefaultProps: SimpleHlsMediaProps = {
  src: '',
  preload: '',
  disableRemotePlayback: false,
  streamType: 'unknown',
};

export interface SimpleHlsMediaAPI extends SimpleHlsMediaProps {
  readonly engine: Composition<SimpleHlsEngineState, SimpleHlsEngineContext>;
  readonly liveEdgeStart: number;
  readonly targetLiveWindow: number;
  attach(mediaElement: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
  play(): Promise<void>;
}

/**
 * `targetLiveWindow` per the media-ui-extensions live-edge proposal: `NaN` for
 * on-demand (or nothing resolved yet), `0` for standard sliding-window live,
 * `Infinity` for DVR (`#EXT-X-PLAYLIST-TYPE:EVENT` — the window grows from the
 * start). Read from the timeline-bearing track's playlist metadata.
 */
function deriveTargetLiveWindow(
  presentation: MaybeResolvedPresentation | undefined,
  trackId: string | undefined
): number {
  if (!isResolvedPresentation(presentation) || !trackId) return Number.NaN;
  const track = findTrackById(presentation, trackId);
  if (!track || !isResolvedTrack(track)) return Number.NaN;
  const metadata = getMediaPlaylistMetadata(track);
  if (!metadata) return Number.NaN;
  if (metadata.playlistType === 'EVENT') return Number.POSITIVE_INFINITY;
  return deriveStreamType(metadata) === 'live' ? 0 : Number.NaN;
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
 * @fires streamtypechange - Fired when the detected stream type changes. Read `streamType` for the new value.
 * @fires targetlivewindowchange - Fired when the target live window changes. Read `targetLiveWindow` for the new value.
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
    #disableRemotePlayback: boolean = simpleHlsMediaDefaultProps.disableRemotePlayback;
    #streamType: SimpleHlsMediaStreamType = simpleHlsMediaDefaultProps.streamType;
    #isUserStreamType = false;
    #targetLiveWindow = Number.NaN;
    #stopLiveSync: () => void;

    /** Pending loadstart listener from a deferred play() retry, if any. */
    #loadstartListener: (() => void) | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { config } = args?.[0] ?? {};
      this.#config = config;
      this.#engine = this.#createEngine();

      // Mirror the engine's live/stream-type detection onto the media surface,
      // firing the change events the store features listen for. One effect over
      // the presentation + selection signals; `liveEdgeStart` is deliberately
      // NOT cached here — it's derived at read time (the store re-reads it on
      // `timeupdate`/`progress`), so a sliding window needs no event churn.
      this.#stopLiveSync = effect(() => {
        const presentation = this.#signals.state.presentation.get();
        this.#setDetectedStreamType(presentation?.streamType ?? 'unknown');
        this.#setTargetLiveWindow(deriveTargetLiveWindow(presentation, liveTrackId(this.#signals.state)));
      });
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
    // Live surface — streamType / targetLiveWindow / liveEdgeStart
    // (the MediaStreamTypeCapability + MediaLiveCapability contract the player
    // store's stream-type and live features consume)
    // -------------------------------------------------------------------------

    /**
     * The source's stream type — `'live'`, `'on-demand'`, or `'unknown'` until
     * a media playlist has been parsed. Setting a non-`'unknown'` value pins a
     * user override (detection stops updating it); setting `'unknown'` reverts
     * to the engine's detected value.
     */
    get streamType(): SimpleHlsMediaStreamType {
      return this.#streamType;
    }

    set streamType(value: SimpleHlsMediaStreamType) {
      if (value === 'unknown') {
        this.#isUserStreamType = false;
        this.#updateStreamType(this.#signals.state.presentation.get()?.streamType ?? 'unknown');
        return;
      }
      this.#isUserStreamType = true;
      this.#updateStreamType(value);
    }

    /**
     * Presentation time marking the start of the live-edge window — playback at
     * `currentTime >= liveEdgeStart` counts as "at the live edge" (the same
     * target the engine's `seekToLiveEdge` seeks to: window end − HOLD-BACK).
     * `NaN` when the stream isn't live or nothing is resolved yet. Derived at
     * read time from the engine's live window — no change event; re-read on
     * `timeupdate`/`progress` (as the store's live feature does).
     */
    get liveEdgeStart(): number {
      const edge = getLiveEdge({
        state: this.#signals.state as LiveWindowState,
        config: { resolveLiveLatency },
      });
      return edge?.liveEdgeStart ?? Number.NaN;
    }

    /**
     * The target live window: `NaN` for on-demand (or unknown), `0` for
     * standard sliding-window live, `Infinity` for DVR
     * (`#EXT-X-PLAYLIST-TYPE:EVENT`). Fires `targetlivewindowchange` on change.
     */
    get targetLiveWindow(): number {
      return this.#targetLiveWindow;
    }

    #setDetectedStreamType(value: SimpleHlsMediaStreamType): void {
      if (this.#isUserStreamType) return;
      this.#updateStreamType(value);
    }

    #updateStreamType(value: SimpleHlsMediaStreamType): void {
      if (this.#streamType === value) return;
      this.#streamType = value;
      // Optional-chained: with an EventTarget-less base (`SimpleHlsMediaElement`
      // standalone) there's nowhere to dispatch; hosts forward it to listeners.
      this.dispatchEvent?.(new Event('streamtypechange'));
    }

    #setTargetLiveWindow(value: number): void {
      if (Object.is(this.#targetLiveWindow, value)) return;
      this.#targetLiveWindow = value;
      this.dispatchEvent?.(new Event('targetlivewindowchange'));
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
      this.#stopLiveSync();
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
    // disableRemotePlayback — synchronous IDL attribute (WHATWG Remote Playback)
    // Author intent for whether the AirPlay/remote picker is offered. Mirrors
    // the DOM attribute name; the value flows to `state.disableRemotePlayback`,
    // which `setupAirPlay` reads to honor an explicit opt-out. The underlying
    // <video>'s own `disableRemotePlayback` stays programmatically managed
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
