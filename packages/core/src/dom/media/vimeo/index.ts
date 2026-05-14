import type { VimeoEmbedParameters, VimeoUrl } from '@vimeo/player';
import Player from '@vimeo/player';
import type {
  MediaEngineHost,
  MediaPictureInPictureCapability,
  MediaTextTrackCapability,
  TimeRangeLike,
  VideoEvents,
} from '../../../core/media/types';
import { TypedEventTarget } from '../../../core/media/types';

export interface VimeoMediaProps {
  /** Vimeo video URL or numeric video ID as a string. */
  src: string;
  /** Do-not-track: disables cookies and analytics (default: `true` for GDPR compliance). */
  dnt: boolean;
  autoplay: boolean;
  autopause: boolean;
  background: boolean;
  byline: boolean;
  /** Hex color string without `#`, e.g. `'ff0000'`. */
  color: string;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  playsinline: boolean;
  portrait: boolean;
  /** Video quality preference, e.g. `'360p'`, `'720p'`, `'1080p'`, `'auto'`. */
  quality: string;
  responsive: boolean;
  /** Enables speed controls (requires Vimeo Plus/Pro account). */
  speed: boolean;
  /** BCP 47 language code to default the caption/subtitle track. */
  texttrack: string;
  title: boolean;
  transparent: boolean;
}

export const vimeoMediaDefaultProps: VimeoMediaProps = {
  src: '',
  dnt: true,
  autoplay: false,
  autopause: true,
  background: false,
  byline: true,
  color: '',
  controls: false,
  loop: false,
  muted: false,
  playsinline: true,
  portrait: true,
  quality: 'auto',
  responsive: false,
  speed: true,
  texttrack: '',
  title: true,
  transparent: true,
};

const EMPTY_TIME_RANGES: Readonly<TimeRangeLike> = Object.freeze({
  length: 0,
  start() {
    return 0;
  },
  end() {
    return 0;
  },
});

export class VimeoMedia
  extends TypedEventTarget<VideoEvents>()
  implements
    MediaEngineHost<Player, HTMLElement>,
    VimeoMediaProps,
    MediaPictureInPictureCapability,
    MediaTextTrackCapability
{
  #player: Player | null = null;
  #container: HTMLElement | null = null;
  #overlay: HTMLDivElement | null = null;
  #activationCleanup: (() => void) | null = null;
  #destroyed = false;

  // PiP only works on Safari via webkit's cross-origin iframe mechanism.
  readonly isPipCapable =
    typeof navigator !== 'undefined' &&
    /Version\/.*Safari\//.test(navigator.userAgent) &&
    !/Chrome|Chromium/.test(navigator.userAgent);

  // Cached playback state — kept in sync via Vimeo SDK events so sync
  // getters always return a meaningful value without extra async round-trips.
  #paused = true;
  #ended = false;
  #duration = NaN;
  #currentTime = 0;
  #buffered = 0;
  #readyState = 0;
  #volume = 1;
  // `#muted` serves both as the initial embed prop and the cached live value.
  // The setter updates it (for pre-mount config) and the volumechange handler
  // keeps it current after the player is running.
  #muted = vimeoMediaDefaultProps.muted;
  #playbackRate = 1;
  #seeking = false;
  #pip = false;
  #error: { code: number; message: string } | null = null;
  #textTracksVideo: HTMLVideoElement | null = null;
  #mountedTracks: TextTrack[] = [];
  #textTracksAbort: AbortController | null = null;

  // Embed props
  #src = vimeoMediaDefaultProps.src;
  #dnt = vimeoMediaDefaultProps.dnt;
  #autoplay = vimeoMediaDefaultProps.autoplay;
  #autopause = vimeoMediaDefaultProps.autopause;
  #background = vimeoMediaDefaultProps.background;
  #byline = vimeoMediaDefaultProps.byline;
  #color = vimeoMediaDefaultProps.color;
  #controls = vimeoMediaDefaultProps.controls;
  #loop = vimeoMediaDefaultProps.loop;
  #playsinline = vimeoMediaDefaultProps.playsinline;
  #portrait = vimeoMediaDefaultProps.portrait;
  #quality = vimeoMediaDefaultProps.quality;
  #responsive = vimeoMediaDefaultProps.responsive;
  #speed = vimeoMediaDefaultProps.speed;
  #texttrack = vimeoMediaDefaultProps.texttrack;
  #title = vimeoMediaDefaultProps.title;
  #transparent = vimeoMediaDefaultProps.transparent;

  get engine() {
    return this.#player;
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

    if (this.#src) this.#mount();
  }

  detach() {
    this.#overlay?.remove();
    this.#overlay = null;
    this.#activationCleanup?.();
    this.#activationCleanup = null;
    this.#unmount();
    this.#container = null;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.detach();
  }

  // -- Source --

  get src() {
    return this.#src;
  }

  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    if (!this.#container) return;
    if (value) this.#mount();
    else this.#unmount();
  }

  get currentSrc() {
    return this.#src;
  }

  get readyState() {
    return this.#readyState;
  }

  load() {
    if (this.#container && this.#src) this.#mount();
  }

  // -- Playback --

  play() {
    return this.#player?.play() ?? Promise.resolve();
  }

  pause() {
    this.#player?.pause();
  }

  get paused() {
    return this.#paused;
  }

  get ended() {
    return this.#ended;
  }

  // -- Seek --

  get currentTime() {
    return this.#currentTime;
  }

  set currentTime(value: number) {
    if (!this.#player) return;
    if (!this.#paused) {
      this.#player.setCurrentTime(value);
      return;
    }
    const seekingPlayer = this.#player;
    const previousTime = this.#currentTime;
    this.#currentTime = value;
    this.#seeking = true;
    this.dispatchEvent(new Event('seeking'));
    this.#player.setCurrentTime(value).then(
      (time) => {
        if (this.#player !== seekingPlayer) return;
        this.#currentTime = time;
        this.#seeking = false;
        this.dispatchEvent(new Event('timeupdate'));
        this.dispatchEvent(new Event('seeked'));
      },
      () => {
        if (this.#player !== seekingPlayer || !this.#seeking) return;
        this.#currentTime = previousTime;
        this.#seeking = false;
        this.dispatchEvent(new Event('seeked'));
      }
    );
  }

  get duration() {
    return this.#duration;
  }

  get seeking() {
    return this.#seeking;
  }

  // -- Volume --

  get volume() {
    return this.#volume;
  }

  set volume(value: number) {
    this.#player?.setVolume(value);
  }

  get muted() {
    return this.#muted;
  }

  set muted(value: boolean) {
    this.#muted = value;
    this.#player?.setMuted(value);
  }

  // -- Playback rate --

  get playbackRate() {
    return this.#playbackRate;
  }

  set playbackRate(value: number) {
    this.#player?.setPlaybackRate(value);
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
    // Only attempt PiP on Safari — webkit's cross-origin iframe mechanism works
    // without requiring user activation in the iframe's browsing context.
    if (this.isPipCapable) this.#postVimeoMethod('requestPictureInPicture');
    return Promise.resolve();
  }

  exitPictureInPicture() {
    if (this.isPipCapable) this.#postVimeoMethod('exitPictureInPicture');
    return Promise.resolve();
  }

  #postVimeoMethod(method: string) {
    const iframe = this.#container?.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe?.contentWindow || !iframe.src) return;
    try {
      const origin = new URL(iframe.src).origin;
      iframe.contentWindow.postMessage({ method }, origin);
    } catch {
      // Ignore cross-origin or URL parse errors.
    }
  }

  // -- Error --

  get error() {
    return this.#error;
  }

  // -- Text tracks --

  get textTracks(): TextTrackList {
    if (!this.#textTracksVideo) {
      this.#textTracksVideo = document.createElement('video');
    }
    return this.#textTracksVideo.textTracks;
  }

  // -- Embed params --

  get dnt() {
    return this.#dnt;
  }

  set dnt(value: boolean) {
    if (this.#dnt === value) return;
    this.#dnt = value;
    if (this.#player) this.#mount();
  }

  get autoplay() {
    return this.#autoplay;
  }

  set autoplay(value: boolean) {
    this.#autoplay = value;
  }

  get autopause() {
    return this.#autopause;
  }

  set autopause(value: boolean) {
    this.#autopause = value;
    this.#player?.setAutopause(value);
  }

  get background() {
    return this.#background;
  }

  set background(value: boolean) {
    if (this.#background === value) return;
    this.#background = value;
    if (this.#player) this.#mount();
  }

  get byline() {
    return this.#byline;
  }

  set byline(value: boolean) {
    if (this.#byline === value) return;
    this.#byline = value;
    if (this.#player) this.#mount();
  }

  get color() {
    return this.#color;
  }

  set color(value: string) {
    this.#color = value;
    if (value) this.#player?.setColor(value);
  }

  get controls() {
    return this.#controls;
  }

  set controls(value: boolean) {
    if (this.#controls === value) return;
    this.#controls = value;
    if (this.#player) this.#mount();
  }

  get loop() {
    return this.#loop;
  }

  set loop(value: boolean) {
    this.#loop = value;
    this.#player?.setLoop(value);
  }

  get playsinline() {
    return this.#playsinline;
  }

  set playsinline(value: boolean) {
    if (this.#playsinline === value) return;
    this.#playsinline = value;
    if (this.#player) this.#mount();
  }

  get portrait() {
    return this.#portrait;
  }

  set portrait(value: boolean) {
    if (this.#portrait === value) return;
    this.#portrait = value;
    if (this.#player) this.#mount();
  }

  get quality() {
    return this.#quality;
  }

  set quality(value: string) {
    this.#quality = value;
    this.#player?.setQuality(value);
  }

  get responsive() {
    return this.#responsive;
  }

  set responsive(value: boolean) {
    if (this.#responsive === value) return;
    this.#responsive = value;
  }

  get speed() {
    return this.#speed;
  }

  set speed(value: boolean) {
    if (this.#speed === value) return;
    this.#speed = value;
    if (this.#player) this.#mount();
  }

  get texttrack() {
    return this.#texttrack;
  }

  set texttrack(value: string) {
    if (this.#texttrack === value) return;
    this.#texttrack = value;
    if (!this.#player) return;
    if (value) this.#player.enableTextTrack(value);
    else this.#player.disableTextTrack();
  }

  get title() {
    return this.#title;
  }

  set title(value: boolean) {
    if (this.#title === value) return;
    this.#title = value;
    if (this.#player) this.#mount();
  }

  get transparent() {
    return this.#transparent;
  }

  set transparent(value: boolean) {
    if (this.#transparent === value) return;
    this.#transparent = value;
    if (this.#player) this.#mount();
  }

  // -- Private --

  #mount() {
    this.#unmount();
    if (!this.#container || !this.#src) return;

    const options: VimeoEmbedParameters = {
      dnt: this.#dnt,
      autoplay: this.#autoplay,
      autopause: this.#autopause,
      background: this.#background,
      byline: this.#byline,
      controls: this.#controls,
      loop: this.#loop,
      muted: this.#muted,
      playsinline: this.#playsinline,
      portrait: this.#portrait,
      quality: this.#quality,
      responsive: false,
      speed: this.#speed,
      title: this.#title,
      transparent: this.#transparent,
    };

    if (this.#color) options.color = this.#color;
    if (this.#texttrack) options.texttrack = this.#texttrack;

    const src = this.#src;
    if (/^\d+$/.test(src)) {
      options.id = parseInt(src, 10);
    } else {
      // Cast: VimeoUrl is a template literal type; we accept any vimeo.com URL.
      options.url = src as VimeoUrl;
    }

    this.#player = new Player(this.#container, options);

    // Make the iframe fill its container completely in both HTML and React contexts.
    const iframe = this.#container.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.display = 'block';
    }

    this.#subscribe(this.#player);

    // The 'error' event covers SDK-level playback errors, but network failures,
    // invalid URLs, and private/deleted videos only surface as a ready() rejection.
    // On success, re-apply iframe sizing because the SDK resets dimensions once ready.
    const mountedPlayer = this.#player;
    mountedPlayer.ready().then(
      () => {
        if (this.#player !== mountedPlayer) return;
        const iframe = this.#container?.querySelector<HTMLIFrameElement>('iframe');
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      },
      (err: Error) => {
        if (this.#player !== mountedPlayer || this.#error) return;
        this.#error = { code: 4, message: err?.message ?? 'Failed to load Vimeo video' };
        this.dispatchEvent(new Event('error'));
      }
    );
  }

  #unmount() {
    if (!this.#player) return;
    this.#textTracksAbort?.abort();
    this.#textTracksAbort = null;
    for (const track of this.#mountedTracks) {
      track.mode = 'disabled';
    }
    this.#mountedTracks = [];
    this.#player.destroy();
    this.#player = null;
    this.#resetState();
  }

  #subscribe(player: Player) {
    player.on('play', () => {
      this.#paused = false;
      this.#ended = false;
      // Vimeo only fires 'play' when the video is actually ready to play,
      // so readyState must be HAVE_ENOUGH_DATA before syncing the store.
      this.#readyState = 4;
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    });

    player.on('pause', () => {
      this.#paused = true;
      this.dispatchEvent(new Event('pause'));
    });

    player.on('ended', () => {
      this.#paused = true;
      this.#ended = true;
      this.dispatchEvent(new Event('ended'));
      this.dispatchEvent(new Event('pause'));
    });

    player.on('timeupdate', ({ seconds }) => {
      this.#currentTime = seconds;
      this.dispatchEvent(new Event('timeupdate'));
    });

    player.on('durationchange', ({ duration }) => {
      this.#duration = duration;
      this.dispatchEvent(new Event('durationchange'));
    });

    player.on('volumechange', ({ volume, muted }) => {
      this.#volume = volume;
      // The Vimeo SDK historically emits only { volume } — `muted` was added
      // later and may be absent. Fall back to cached value to avoid corruption.
      this.#muted = muted ?? this.#muted;
      this.dispatchEvent(new Event('volumechange'));
    });

    player.on('playbackratechange', ({ playbackRate }) => {
      this.#playbackRate = playbackRate;
      this.dispatchEvent(new Event('ratechange'));
    });

    player.on('seeking', () => {
      // Seeking means the current position's data is no longer available.
      this.#readyState = 2;
      this.#seeking = true;
      this.dispatchEvent(new Event('seeking'));
    });

    player.on('seeked', () => {
      this.#readyState = 4;
      this.#seeking = false;
      this.dispatchEvent(new Event('seeked'));
    });

    player.on('bufferstart', () => {
      // Rebuffering — data at current position only.
      this.#readyState = 2;
      this.dispatchEvent(new Event('waiting'));
    });

    player.on('bufferend', () => {
      this.#readyState = 4;
      this.dispatchEvent(new Event('canplay'));
      // Dispatch 'playing' so playbackFeature re-syncs waiting → false.
      if (!this.#paused) this.dispatchEvent(new Event('playing'));
    });

    player.on('loaded', () => {
      // 'loaded' fires when the video is ready to play — treat as HAVE_ENOUGH_DATA.
      this.#readyState = 4;
      this.dispatchEvent(new Event('loadstart'));
      this.dispatchEvent(new Event('loadedmetadata'));
      this.dispatchEvent(new Event('loadeddata'));
      this.dispatchEvent(new Event('canplay'));
      this.dispatchEvent(new Event('canplaythrough'));
    });

    player.on('error', ({ name, message }) => {
      // NotAllowedError means a browser permission/gesture requirement wasn't met
      // (e.g. requestPictureInPicture cross-origin, autoplay blocked). These are
      // not playback errors and should not trigger the error dialog.
      if (name === 'NotAllowedError') return;
      // Map Vimeo error names to MediaError codes (3 = MEDIA_ERR_DECODE, 4 = MEDIA_ERR_SRC_NOT_SUPPORTED)
      this.#error = { code: name === 'NotFoundError' ? 4 : 3, message };
      this.dispatchEvent(new Event('error'));
    });

    player.on('enterpictureinpicture', () => {
      this.#pip = true;
      this.dispatchEvent(new Event('enterpictureinpicture'));
    });

    player.on('leavepictureinpicture', () => {
      this.#pip = false;
      this.dispatchEvent(new Event('leavepictureinpicture'));
    });

    player.on('progress', ({ seconds }) => {
      this.#buffered = seconds;
      this.dispatchEvent(new Event('progress'));
    });

    player.on('resize', () => {
      this.dispatchEvent(new Event('resize'));
    });

    // Seed cached state from current player values to handle already-loaded videos.
    const seededPlayer = player;
    Promise.all([
      player.getVolume(),
      player.getMuted(),
      player.getPaused(),
      player.getDuration(),
      player.getPlaybackRate(),
    ])
      .then(([volume, muted, paused, duration, rate]) => {
        if (this.#player !== seededPlayer) return;
        this.#volume = volume;
        this.#muted = muted;
        this.#paused = paused;
        this.#duration = duration;
        this.#playbackRate = rate;
        // Notify the store of the actual initial state — the feature's sync()
        // ran before these promises resolved, so the store needs a nudge.
        this.dispatchEvent(new Event('volumechange'));
        this.dispatchEvent(new Event('durationchange'));
        this.dispatchEvent(new Event('ratechange'));
      })
      .catch(() => {});

    // Populate the synthetic TextTrackList from the Vimeo API.
    if (!this.#textTracksVideo) {
      this.#textTracksVideo = document.createElement('video');
    }
    const textTracksVideo = this.#textTracksVideo;
    const mountedPlayer = player;

    player
      .getTextTracks()
      .then((vimeoTracks) => {
        if (this.#player !== mountedPlayer) return;
        for (const t of vimeoTracks) {
          const track = textTracksVideo.addTextTrack(t.kind as TextTrackKind, t.label, t.language);
          track.mode = t.mode === 'showing' ? 'showing' : 'disabled';
          this.#mountedTracks.push(track);
        }
      })
      .catch(() => {});

    // Forward track-mode changes made by the UI back to the Vimeo iframe.
    this.#textTracksAbort?.abort();
    this.#textTracksAbort = new AbortController();
    textTracksVideo.textTracks.addEventListener(
      'change',
      () => {
        const active = Array.from(textTracksVideo.textTracks).find(
          (t) => t.mode === 'showing' && this.#mountedTracks.includes(t as TextTrack)
        );
        if (active) {
          player.enableTextTrack(active.language, active.kind);
        } else {
          player.disableTextTrack();
        }
      },
      { signal: this.#textTracksAbort.signal }
    );
  }

  #resetState() {
    this.#paused = true;
    this.#ended = false;
    this.#duration = NaN;
    this.#currentTime = 0;
    this.#buffered = 0;
    this.#readyState = 0;
    this.#volume = 1;
    this.#playbackRate = 1;
    this.#seeking = false;
    this.#pip = false;
    this.#error = null;
    // #muted is intentionally preserved — it's both prop config and cached state.
    this.dispatchEvent(new Event('emptied'));
  }
}
