import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { Composition } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  type SvtaError,
} from '../../../media/errors';
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
  readonly error: SimpleHlsMediaError | null;
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

// ============================================================================
// Error surface
// ============================================================================

/**
 * The error shape the media surface exposes — structurally compatible with
 * `@videojs/media`'s `ErrorLike` (`{ code, message }`) without importing it.
 * The dependency can't go that way: `@videojs/media` already depends on this
 * package. (That inversion is itself a known follow-up; structural
 * compatibility is the same approach `SimpleHlsMediaStreamType` takes.)
 *
 * `code` is the **SVTA code**, not a `MediaError.MEDIA_ERR_*` value. Consumers
 * that map codes to copy currently only know 1–5, so an SVTA code falls through
 * to showing `message`; an extensible code lookup above the engine is the
 * follow-up that fixes it.
 */
export interface SimpleHlsMediaError {
  readonly code: number;
  readonly message: string;
  /** Reporter context (which selection emptied, which track, …). */
  readonly data?: unknown;
}

/**
 * Which reported conditions this composition treats as **fatal** — the ones that
 * reach `error` and fire `'error'`. Severity isn't part of an SVTA code
 * (§Approach: "impact varies with player implementation"), and here it also
 * varies by composition, so it's decided at this boundary rather than by the
 * reporter.
 *
 * An allow-list, deliberately: only *verdicts* are here. The per-rendition causes
 * `resolve-track` reports (unsupported format, unsupported DRM) stay in the
 * sequence as context — one unplayable rendition doesn't fail the source, and
 * promoting a cause would put a dialog over a mixed source that goes on to play.
 * They still shape the *copy*, though — see {@link resolveFatalMessage}.
 */
const FATAL_SVTA_CODES: ReadonlySet<number> = new Set<number>([
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
]);

/**
 * Fallback copy per code, used when a reporter supplied none. Visible to
 * viewers today (consumers fall back to `message` for codes they can't map), so
 * these are written for a person, not a log.
 */
const FATAL_SVTA_MESSAGES: Readonly<Record<number, string>> = {
  [SVTA_NO_SUPPORTED_VIDEO_TRACK]: 'This video is in a format this browser can’t play.',
  [SVTA_NO_SUPPORTED_AUDIO_TRACK]: 'This audio is in a format this browser can’t play.',
};

/**
 * Copy for a verdict whose causes all say the same thing. A verdict only reports
 * that nothing was selectable; *why* lives in the causes, and where they agree
 * the cause is the more truthful thing to tell a viewer — "protected" rather
 * than "a format this browser can't play" for an encrypted source.
 *
 * Only conditions that change the story need an entry. An unsupported *format*
 * cause says what {@link FATAL_SVTA_MESSAGES} already says, so it has none.
 */
const FATAL_SVTA_MESSAGES_BY_CAUSE: Readonly<Record<number, Readonly<Record<number, string>>>> = {
  [SVTA_NO_SUPPORTED_VIDEO_TRACK]: {
    [SVTA_UNSUPPORTED_DRM_SYSTEM]: 'This video is protected and can’t be played in this browser.',
  },
  [SVTA_NO_SUPPORTED_AUDIO_TRACK]: {
    [SVTA_UNSUPPORTED_DRM_SYSTEM]: 'This audio is protected and can’t be played in this browser.',
  },
};

/** The first fatal condition in the sequence — the root cause, not its consequences. */
function firstFatal(errors: readonly SvtaError[] | undefined): SvtaError | undefined {
  return errors?.find((error) => FATAL_SVTA_CODES.has(error.code));
}

/** The `trackType` a reporter tagged a condition with, when it did. */
function causeTrackType(error: SvtaError): string | undefined {
  const data = error.data as { trackType?: unknown } | null | undefined;
  return typeof data?.trackType === 'string' ? data.trackType : undefined;
}

/**
 * Copy for `verdict`, preferring what its causes agree on.
 *
 * Agreement has to be unanimous among the causes for the verdict's own track
 * type. A source with one encrypted rendition and one MPEG-TS rendition has no
 * single explanation, and picking either would tell a viewer something that
 * isn't true of the source as a whole — so a split falls back to the verdict's
 * own copy. Same for causes about the *other* type: an all-encrypted audio
 * track alongside an all-MPEG-TS video one must not make the video verdict read
 * as a protection failure.
 *
 * Latching still wins over completeness. `#setError` keys on the code, so copy
 * is composed from whatever the sequence held when the verdict first landed; a
 * cause appended afterward doesn't rewrite an error already surfaced.
 */
function resolveFatalMessage(verdict: SvtaError, errors: readonly SvtaError[] | undefined): string {
  const byCause = FATAL_SVTA_MESSAGES_BY_CAUSE[verdict.code];
  const trackType = verdict.code === SVTA_NO_SUPPORTED_AUDIO_TRACK ? 'audio' : 'video';
  const causes = errors?.filter((error) => !FATAL_SVTA_CODES.has(error.code) && causeTrackType(error) === trackType);

  const first = causes?.[0];
  if (byCause && first && causes?.every((cause) => cause.code === first.code)) {
    const unanimous = byCause[first.code];
    if (unanimous) return unanimous;
  }

  return FATAL_SVTA_MESSAGES[verdict.code] ?? '';
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
 * @fires error - Fired when a fatal condition is reported. Read `error` for it.
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
    #error: SimpleHlsMediaError | null = null;
    #stopLiveSync: () => void;
    #stopErrorSync: () => void;

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

      // Promote the first fatal condition out of the engine's reported sequence
      // onto the media surface. Clearing rides the same signal: `collectErrors`
      // resets the slot per source, so a new source starts with no error without
      // this needing its own source-change hook.
      this.#stopErrorSync = effect(() => {
        const errors = this.#signals.state.errors.get();
        this.#setError(firstFatal(errors), errors);
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
     * The current fatal error, or `null`. Only *fatal* conditions appear here —
     * the engine reports non-fatal ones too (they stay in `engine.state.errors`),
     * and promoting them would tell a consumer playback had failed when it
     * hadn't. Resets per source. Fires `'error'` when set.
     */
    get error(): SimpleHlsMediaError | null {
      return this.#error;
    }

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

    #setError(reported: SvtaError | undefined, errors: readonly SvtaError[] | undefined): void {
      if (!reported) {
        // Cleared (new source). No event: `'error'` announces a failure, and
        // consumers reset their own copy on source change.
        this.#error = null;
        return;
      }
      // Keyed on the code, not the object: a later append re-runs this effect
      // with an equal-but-new array, and re-firing `'error'` for a condition
      // already surfaced would look like a second failure.
      if (this.#error?.code === reported.code) return;
      this.#error = {
        code: reported.code,
        message: reported.message ?? resolveFatalMessage(reported, errors),
        ...(reported.data === undefined ? {} : { data: reported.data }),
      };
      this.dispatchEvent?.(new Event('error'));
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
