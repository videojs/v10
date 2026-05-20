import type {
  MediaEngineHost,
  MediaPictureInPictureCapability,
  MediaTextTrackCapability,
  TimeRangeLike,
  VideoEvents,
} from '../../core/media/types';
import { TypedEventTarget } from '../../core/media/types';

export interface PlaybackStateCache {
  paused: boolean;
  ended: boolean;
  duration: number;
  currentTime: number;
  /** Seconds buffered — converted to a `TimeRangeLike` by `get buffered()`. */
  buffered: number;
  readyState: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  seeking: boolean;
  pip: boolean;
  error: { code: number; message: string } | null;
}

const EMPTY_TIME_RANGES: Readonly<TimeRangeLike> = Object.freeze({
  length: 0,
  start() {
    return 0;
  },
  end() {
    return 0;
  },
});

export abstract class IframeMediaHost<Engine>
  extends TypedEventTarget<VideoEvents>()
  implements MediaEngineHost<Engine, HTMLElement>, MediaPictureInPictureCapability, MediaTextTrackCapability
{
  #engine: Engine | null = null;
  #container: HTMLElement | null = null;
  #overlay: HTMLDivElement | null = null;
  #activationCleanup: (() => void) | null = null;
  #destroyed = false;
  #textTracksVideo: HTMLVideoElement | null = null;
  #mountedTracks: TextTrack[] = [];
  #textTracksAbort: AbortController | null = null;

  // Cached playback state — kept in sync via provider SDK events so sync
  // getters always return a meaningful value without extra async round-trips.
  #paused = true;
  #ended = false;
  #duration = NaN;
  #currentTime = 0;
  #buffered = 0;
  #readyState = 0;
  #volume = 1;
  // `#muted` serves both as the initial embed prop and the cached live value.
  // The setter updates it (for pre-mount config) and the provider's volumechange
  // handler keeps it current after the player is running.
  #muted = false;
  #playbackRate = 1;
  #seeking = false;
  #pip = false;
  #error: { code: number; message: string } | null = null;

  // PiP only works on Safari via webkit's cross-origin iframe mechanism.
  readonly isPipCapable =
    typeof navigator !== 'undefined' &&
    /Version\/.*Safari\//.test(navigator.userAgent) &&
    !/Chrome|Chromium/.test(navigator.userAgent);

  get engine() {
    return this.#engine;
  }

  get target() {
    return this.#container;
  }

  attach(container: HTMLElement) {
    this.#container = container;
    container.style.position = 'relative';

    // Overlay: sits above the iframe so pointer events reach <media-container>
    // for controlsFeature (hover-to-show, idle timer, etc.).
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;z-index:1;';
    container.appendChild(overlay);
    this.#overlay = overlay;

    // PiP requires the iframe's browsing context to have user activation.
    // Since the overlay intercepts clicks, the iframe never gets direct
    // interaction. Work around this by focusing the iframe on every user click
    // anywhere in the document — iframe.focus() during a user gesture gives
    // the iframe activation via Chrome's focus-delegation mechanism.
    const focusIframe = () => {
      const iframe = this.#container?.querySelector<HTMLIFrameElement>('iframe');
      iframe?.focus();
    };
    globalThis.document?.addEventListener('click', focusIframe, { capture: true });
    this.#activationCleanup = () => globalThis.document?.removeEventListener('click', focusIframe, { capture: true });

    if (this.src) this.mount(container);
  }

  detach() {
    this.#overlay?.remove();
    this.#overlay = null;
    this.#activationCleanup?.();
    this.#activationCleanup = null;
    this.unmount();
    this.#container = null;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.detach();
  }

  load() {
    if (this.#container && this.src) this.mount(this.#container);
  }

  // -- Playback state --

  get paused() {
    return this.#paused;
  }

  get ended() {
    return this.#ended;
  }

  get duration() {
    return this.#duration;
  }

  get currentTime() {
    return this.#currentTime;
  }

  get seeking() {
    return this.#seeking;
  }

  get readyState() {
    return this.#readyState;
  }

  get error() {
    return this.#error;
  }

  // -- Volume --

  get volume() {
    return this.#volume;
  }

  set volume(value: number) {
    this.updateState({ volume: value });
    this.onSetVolume(value);
  }

  get muted() {
    return this.#muted;
  }

  set muted(value: boolean) {
    this.updateState({ muted: value });
    this.onSetMuted(value);
  }

  // -- Playback rate --

  get playbackRate() {
    return this.#playbackRate;
  }

  set playbackRate(value: number) {
    this.updateState({ playbackRate: value });
    this.onSetPlaybackRate(value);
  }

  // -- Buffer --

  get buffered(): TimeRangeLike {
    if (this.#buffered > 0) {
      const end = this.#buffered;
      return Object.freeze({ length: 1, start: () => 0, end: () => end });
    }
    return EMPTY_TIME_RANGES;
  }

  get seekable(): TimeRangeLike {
    return EMPTY_TIME_RANGES;
  }

  // -- Picture-in-picture --

  get isPictureInPicture() {
    return this.#pip;
  }

  requestPictureInPicture() {
    if (this.isPipCapable) this.#postIframeMethod('requestPictureInPicture');
    return Promise.resolve();
  }

  exitPictureInPicture() {
    if (this.isPipCapable) this.#postIframeMethod('exitPictureInPicture');
    return Promise.resolve();
  }

  // -- Text tracks --

  get textTracks(): TextTrackList {
    return this.syntheticTextTracksVideo.textTracks;
  }

  // -- Abstract interface --

  protected abstract get src(): string | null;
  protected abstract mount(container: HTMLElement): void;
  protected abstract unmount(): void;
  abstract play(): Promise<void>;
  abstract pause(): Promise<void>;

  protected abstract onSetVolume(value: number): void;
  protected abstract onSetMuted(value: boolean): void;
  protected abstract onSetPlaybackRate(value: number): void;

  // -- Protected helpers --

  protected updateEngine(engine: Engine | null): void {
    this.#engine = engine;
  }

  protected updateState({
    paused,
    ended,
    duration,
    currentTime,
    buffered,
    readyState,
    volume,
    muted,
    playbackRate,
    seeking,
    pip,
    error,
  }: Partial<PlaybackStateCache>): void {
    if (paused !== undefined) this.#paused = paused;
    if (ended !== undefined) this.#ended = ended;
    if (duration !== undefined) this.#duration = duration;
    if (currentTime !== undefined) this.#currentTime = currentTime;
    if (buffered !== undefined) this.#buffered = buffered;
    if (readyState !== undefined) this.#readyState = readyState;
    if (volume !== undefined) this.#volume = volume;
    if (muted !== undefined) this.#muted = muted;
    if (playbackRate !== undefined) this.#playbackRate = playbackRate;
    if (seeking !== undefined) this.#seeking = seeking;
    if (pip !== undefined) this.#pip = pip;
    if (error !== undefined) this.#error = error;
  }

  protected get syntheticTextTracksVideo(): HTMLVideoElement {
    if (!this.#textTracksVideo) {
      this.#textTracksVideo = document.createElement('video');
    }
    return this.#textTracksVideo;
  }

  protected addMountedTrack(track: TextTrack): void {
    this.#mountedTracks.push(track);
  }

  protected isMountedTrack(track: TextTrack): boolean {
    return this.#mountedTracks.includes(track);
  }

  protected resetTextTracks(): void {
    this.#textTracksAbort?.abort();
    this.#textTracksAbort = null;
    for (const track of this.#mountedTracks) {
      track.mode = 'disabled';
    }
    this.#mountedTracks = [];
    // Replace the synthetic video element so old tracks don't persist into the
    // next load. HTMLVideoElement.textTracks has no removeTrack() API, so the
    // only way to clear the list is to start with a fresh element.
    this.#textTracksVideo = null;
  }

  protected startTextTrackAbort(): AbortController {
    this.#textTracksAbort?.abort();
    this.#textTracksAbort = new AbortController();
    return this.#textTracksAbort;
  }

  protected resetState(): void {
    this.updateState({
      paused: true,
      ended: false,
      duration: NaN,
      currentTime: 0,
      buffered: 0,
      readyState: 0,
      volume: 1,
      playbackRate: 1,
      seeking: false,
      pip: false,
      error: null,
      // muted intentionally not reset — it's both prop config and cached state
    });
    this.dispatchEvent(new Event('emptied'));
  }

  // -- Private --

  #postIframeMethod(method: string) {
    const iframe = this.#container?.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe?.contentWindow || !iframe.src) return;
    try {
      const origin = new URL(iframe.src).origin;
      iframe.contentWindow.postMessage({ method }, origin);
    } catch {
      // Ignore cross-origin or URL parse errors.
    }
  }
}
