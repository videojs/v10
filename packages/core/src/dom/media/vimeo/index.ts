import type { VimeoEmbedParameters, VimeoUrl } from '@vimeo/player';
import Player from '@vimeo/player';
import { IframeMediaHost } from '../iframe-host';

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

export class VimeoMedia extends IframeMediaHost<Player> implements VimeoMediaProps {
  // Local typed reference — kept in sync with base `engine` via `updateEngine`.
  #player: Player | null = null;

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

  // -- Source --

  // Overrides `protected abstract get src()` with public access — satisfies both
  // the base class contract and VimeoMediaProps.
  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    const container = this.target;
    if (!container) return;
    if (value) this.mount(container);
    else this.unmount();
  }

  get currentSrc() {
    return this.#src;
  }

  // -- Playback --

  play() {
    return this.#player?.play() ?? Promise.resolve();
  }

  pause() {
    return this.#player?.pause() ?? Promise.resolve();
  }

  // -- Seek --

  get currentTime() {
    return super.currentTime;
  }

  set currentTime(value: number) {
    if (!this.#player) return;
    if (!this.paused) {
      this.#player.setCurrentTime(value);
      return;
    }
    const seekingPlayer = this.#player;
    const previousTime = this.currentTime;
    this.updateState({ currentTime: value, seeking: true });
    this.dispatchEvent(new Event('seeking'));
    this.#player.setCurrentTime(value).then(
      (time) => {
        if (this.#player !== seekingPlayer) return;
        this.updateState({ currentTime: time, seeking: false });
        this.dispatchEvent(new Event('timeupdate'));
        this.dispatchEvent(new Event('seeked'));
      },
      () => {
        if (this.#player !== seekingPlayer || !this.seeking) return;
        this.updateState({ currentTime: previousTime, seeking: false });
        this.dispatchEvent(new Event('seeked'));
      }
    );
  }

  // -- Volume / playback rate delegates --

  protected onSetVolume(value: number) {
    this.#player?.setVolume(value);
  }

  protected onSetMuted(value: boolean) {
    this.#player?.setMuted(value);
  }

  protected onSetPlaybackRate(value: number) {
    this.#player?.setPlaybackRate(value);
  }

  // -- Embed params --

  get dnt() {
    return this.#dnt;
  }

  set dnt(value: boolean) {
    if (this.#dnt === value) return;
    this.#dnt = value;
    if (this.#player) this.mount(this.target!);
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
    if (this.#player) this.mount(this.target!);
  }

  get byline() {
    return this.#byline;
  }

  set byline(value: boolean) {
    if (this.#byline === value) return;
    this.#byline = value;
    if (this.#player) this.mount(this.target!);
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
    if (this.#player) this.mount(this.target!);
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
    if (this.#player) this.mount(this.target!);
  }

  get portrait() {
    return this.#portrait;
  }

  set portrait(value: boolean) {
    if (this.#portrait === value) return;
    this.#portrait = value;
    if (this.#player) this.mount(this.target!);
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
    if (this.#player) this.mount(this.target!);
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
    if (this.#player) this.mount(this.target!);
  }

  get transparent() {
    return this.#transparent;
  }

  set transparent(value: boolean) {
    if (this.#transparent === value) return;
    this.#transparent = value;
    if (this.#player) this.mount(this.target!);
  }

  // -- Protected lifecycle --

  protected mount(container: HTMLElement) {
    this.unmount();
    if (!this.#src) return;

    const options: VimeoEmbedParameters = {
      dnt: this.#dnt,
      autoplay: this.#autoplay,
      autopause: this.#autopause,
      background: this.#background,
      byline: this.#byline,
      controls: this.#controls,
      loop: this.#loop,
      muted: this.muted,
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

    this.#player = new Player(container, options);
    this.updateEngine(this.#player);

    // Make the iframe fill its container completely in both HTML and React contexts.
    const iframe = container.querySelector('iframe');
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
        const iframe = container.querySelector<HTMLIFrameElement>('iframe');
        if (iframe) {
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      },
      (err: Error) => {
        if (this.#player !== mountedPlayer || this.error) return;
        this.updateState({ error: { code: 4, message: err?.message ?? 'Failed to load Vimeo video' } });
        this.dispatchEvent(new Event('error'));
      }
    );
  }

  protected unmount() {
    if (!this.#player) return;
    this.resetTextTracks();
    this.#player.destroy();
    this.#player = null;
    this.updateEngine(null);
    this.resetState();
  }

  // -- Private --

  #subscribe(player: Player) {
    player.on('play', () => {
      this.updateState({ paused: false, ended: false, readyState: 4 });
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    });

    player.on('pause', () => {
      this.updateState({ paused: true });
      this.dispatchEvent(new Event('pause'));
    });

    player.on('ended', () => {
      this.updateState({ paused: true, ended: true });
      this.dispatchEvent(new Event('ended'));
      this.dispatchEvent(new Event('pause'));
    });

    player.on('timeupdate', ({ seconds }) => {
      this.updateState({ currentTime: seconds });
      this.dispatchEvent(new Event('timeupdate'));
    });

    player.on('durationchange', ({ duration }) => {
      this.updateState({ duration });
      this.dispatchEvent(new Event('durationchange'));
    });

    player.on('volumechange', ({ volume, muted }) => {
      // The Vimeo SDK historically emits only { volume } — `muted` was added
      // later and may be absent. Fall back to cached value to avoid corruption.
      this.updateState({ volume, muted: muted ?? this.muted });
      this.dispatchEvent(new Event('volumechange'));
    });

    player.on('playbackratechange', ({ playbackRate }) => {
      this.updateState({ playbackRate });
      this.dispatchEvent(new Event('ratechange'));
    });

    player.on('seeking', () => {
      // Seeking means the current position's data is no longer available.
      this.updateState({ readyState: 2, seeking: true });
      this.dispatchEvent(new Event('seeking'));
    });

    player.on('seeked', () => {
      this.updateState({ readyState: 4, seeking: false });
      this.dispatchEvent(new Event('seeked'));
    });

    player.on('bufferstart', () => {
      // Rebuffering — data at current position only.
      this.updateState({ readyState: 2 });
      this.dispatchEvent(new Event('waiting'));
    });

    player.on('bufferend', () => {
      this.updateState({ readyState: 4 });
      this.dispatchEvent(new Event('canplay'));
      // Dispatch 'playing' so playbackFeature re-syncs waiting → false.
      if (!this.paused) this.dispatchEvent(new Event('playing'));
    });

    player.on('loaded', () => {
      // 'loaded' fires when the video is ready to play — treat as HAVE_ENOUGH_DATA.
      this.updateState({ readyState: 4 });
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
      this.updateState({ error: { code: name === 'NotFoundError' ? 4 : 3, message } });
      this.dispatchEvent(new Event('error'));
    });

    player.on('enterpictureinpicture', () => {
      this.updateState({ pip: true });
      this.dispatchEvent(new Event('enterpictureinpicture'));
    });

    player.on('leavepictureinpicture', () => {
      this.updateState({ pip: false });
      this.dispatchEvent(new Event('leavepictureinpicture'));
    });

    player.on('progress', ({ seconds }) => {
      this.updateState({ buffered: seconds });
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
      .then(([volume, muted, paused, duration, playbackRate]) => {
        if (this.#player !== seededPlayer) return;
        this.updateState({ volume, muted, paused, duration, playbackRate });
        // Notify the store of the actual initial state — the feature's sync()
        // ran before these promises resolved, so the store needs a nudge.
        this.dispatchEvent(new Event('volumechange'));
        this.dispatchEvent(new Event('durationchange'));
        this.dispatchEvent(new Event('ratechange'));
      })
      .catch(() => {});

    // Populate the synthetic TextTrackList from the Vimeo API.
    const textTracksVideo = this.syntheticTextTracksVideo;
    const mountedPlayer = player;

    player
      .getTextTracks()
      .then((vimeoTracks) => {
        if (this.#player !== mountedPlayer) return;
        for (const t of vimeoTracks) {
          const track = textTracksVideo.addTextTrack(t.kind as TextTrackKind, t.label, t.language);
          track.mode = t.mode === 'showing' ? 'showing' : 'disabled';
          this.addMountedTrack(track);
        }
      })
      .catch(() => {});

    // Forward track-mode changes made by the UI back to the Vimeo iframe.
    const abort = this.startTextTrackAbort();
    textTracksVideo.textTracks.addEventListener(
      'change',
      () => {
        const active = Array.from(textTracksVideo.textTracks).find(
          (t) => t.mode === 'showing' && this.isMountedTrack(t as TextTrack)
        );
        if (active) {
          player.enableTextTrack(active.language, active.kind);
        } else {
          player.disableTextTrack();
        }
      },
      { signal: abort.signal }
    );
  }
}
