// SPIKE: a Video.js Media over Remotion's public `<Player>` + `PlayerRef` surface.
//
// Shape mirrors the embed adapters (`@videojs/youtube-video`): a plain `EventTarget` subclass that implements the
// capabilities it can honor, opts out of the rest with the shared sentinels, and speaks standard media event names so
// the default store features attach unchanged. The "target" it attaches to is a Remotion `PlayerRef`, not a DOM node.
//
// Frame ↔ time: Remotion counts integer frames at a fixed `fps`; the media contract speaks seconds. `duration` is
// `durationInFrames / fps`, `currentTime` is `frame / fps`, and seeks round to the nearest frame.

import type { CallbackListener, EventTypes, PlayerRef } from '@remotion/player';
import {
  EMPTY_TEXT_TRACKS,
  EMPTY_TIME_RANGES,
  MediaError,
  type MediaPreloadType,
  MediaReadyState,
  type TextTrackListLike,
  type Video,
} from '@videojs/media';
import { createTimeRange, MediaPlayedRangesMixin } from '@videojs/media/dom';
import type { ComponentType } from 'react';

/** What plays: the composition and its timing. Analogous to the embed adapters' `source` objects. */
export interface RemotionSource {
  /** Stable name for `src`/`currentSrc`; store features gate on a non-empty source string. */
  id: string;
  component: ComponentType<Record<string, unknown>>;
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  inputProps?: Record<string, unknown>;
  /** Scene markers in frames, surfaced to the player as a `chapters` text track. */
  chapters?: readonly RemotionChapter[];
  /**
   * Timed captions, surfaced as a `subtitles` text track so the player's captions menu can toggle them. The composition
   * draws them itself; the track carries the timing and the on/off state.
   */
  subtitles?: RemotionSubtitles;
}

export interface RemotionCaption {
  text: string;
  startMs: number;
  endMs: number;
}

export interface RemotionSubtitles {
  label: string;
  language: string;
  cues: readonly RemotionCaption[];
}

export interface RemotionChapter {
  title: string;
  from: number;
  /** Defaults to the span up to the next chapter, or the end of the composition. */
  durationInFrames?: number;
}

/** True when two sources differ only in `inputProps`, which `<Player>` takes live without a reload. */
function sameComposition(a: RemotionSource, b: RemotionSource) {
  return (
    a.id === b.id &&
    a.component === b.component &&
    a.durationInFrames === b.durationInFrames &&
    a.fps === b.fps &&
    a.compositionWidth === b.compositionWidth &&
    a.compositionHeight === b.compositionHeight &&
    a.chapters === b.chapters &&
    a.subtitles === b.subtitles
  );
}

export interface RemotionAdapterProps {
  source: RemotionSource | null;
  autoplay: boolean;
  defaultMuted: boolean;
  muted: boolean;
  volume: number;
  loop: boolean;
  playbackRate: number;
  controls: boolean;
  playsInline: boolean;
  poster: string;
}

/** The props the React wrapper forwards to `<Player>` because Remotion exposes them as props, not ref methods. */
export interface RemotionPlayerProps {
  source: RemotionSource | null;
  loop: boolean;
  playbackRate: number;
  initiallyMuted: boolean;
  initialVolume: number;
}

export class RemotionAdapter extends MediaPlayedRangesMixin(EventTarget) implements Partial<Video> {
  static readonly defaultProps: RemotionAdapterProps = {
    source: null,
    autoplay: false,
    defaultMuted: false,
    muted: false,
    volume: 1,
    loop: false,
    playbackRate: 1,
    controls: false,
    playsInline: true,
    poster: '',
  };

  static PLAYER_SOFTWARE_NAME = 'remotion-video';

  #player: PlayerRef | null = null;
  #unbind: (() => void) | null = null;

  #source: RemotionSource | null = null;
  #autoplay = RemotionAdapter.defaultProps.autoplay;
  #defaultMuted = RemotionAdapter.defaultProps.defaultMuted;
  #controls = RemotionAdapter.defaultProps.controls;
  #playsInline = RemotionAdapter.defaultProps.playsInline;
  #poster = RemotionAdapter.defaultProps.poster;

  #paused = true;
  #ended = false;
  #seeking = false;
  #buffering = false;
  #currentTime = 0;
  #volume = RemotionAdapter.defaultProps.volume;
  #muted = RemotionAdapter.defaultProps.muted;
  #playbackRate = RemotionAdapter.defaultProps.playbackRate;
  #loop = RemotionAdapter.defaultProps.loop;
  #readyState: number = MediaReadyState.HAVE_NOTHING;
  #error: MediaError | null = null;

  // Remotion's `seekTo` while playing pauses, seeks, then resumes in an effect, emitting `pause` and `play` around the
  // seek. Those are mechanics, not state changes the store should see, so a seek from a playing state swallows one of
  // each. `ended` clears the debt: seeking onto the last frame ends instead of resuming.
  #swallowPause = 0;
  #swallowPlay = 0;
  #seekTargetFrame = -1;

  // The wrapper subscribes here for the values that only reach Remotion as `<Player>` props.
  #propListeners = new Set<() => void>();
  #propsSnapshot: RemotionPlayerProps = this.#snapshotPlayerProps();

  /** The Remotion `PlayerRef` (null until the wrapper mounts a `<Player>`). */
  get engine(): PlayerRef | null {
    return this.#player;
  }

  /** Subscribe to `<Player>` prop changes; the React wrapper feeds this to `useSyncExternalStore`. */
  subscribePlayerProps = (listener: () => void): (() => void) => {
    this.#propListeners.add(listener);
    return () => this.#propListeners.delete(listener);
  };

  getPlayerProps = (): RemotionPlayerProps => this.#propsSnapshot;

  #snapshotPlayerProps(): RemotionPlayerProps {
    return {
      source: this.#source,
      loop: this.#loop,
      playbackRate: this.#playbackRate,
      initiallyMuted: this.#muted || this.#defaultMuted,
      initialVolume: this.#volume,
    };
  }

  #notifyPlayerProps() {
    this.#propsSnapshot = this.#snapshotPlayerProps();

    for (const listener of this.#propListeners) listener();
  }

  attach(player: PlayerRef | null): void {
    if (!player || this.#player === player) return;

    if (this.#player) this.detach();

    this.#player = player;
    this.#bindPlayerEvents(player);

    // Mirror what the mounted Player already holds; `initiallyMuted`/`initialVolume` only apply at mount.
    this.#muted = player.isMuted();
    this.#paused = !player.isPlaying();
    this.#currentTime = this.#frameToTime(player.getCurrentFrame());

    this.#announceLoaded();
  }

  detach(): void {
    if (!this.#player) return;

    this.#unbind?.();
    this.#unbind = null;
    this.#player = null;
    this.#resetPlaybackState();
  }

  override destroy() {
    this.detach();
    this.#propListeners.clear();
    super.destroy();
  }

  // ----------------------------------------
  // Source
  // ----------------------------------------

  get source(): RemotionSource | null {
    return this.#source;
  }
  set source(value: RemotionSource | null) {
    const source = value ?? null;
    if (source === this.#source) return;

    const previous = this.#source;

    this.#source = source;
    this.#notifyPlayerProps();

    // Editing input props is a live update of the same composition, not a new source.
    if (previous && source && sameComposition(previous, source)) return;

    this.dispatchEvent(new Event('sourcechange'));
    void this.load();
  }

  get src() {
    return this.#source ? `remotion:${this.#source.id}` : '';
  }
  set src(_value: string) {
    // A composition cannot be named by URL; `source` is the one way to set what plays.
  }

  get currentSrc() {
    return this.src;
  }

  get readyState() {
    return this.#readyState;
  }

  get preload(): MediaPreloadType {
    return 'auto';
  }
  set preload(_value: MediaPreloadType) {}

  get crossOrigin() {
    return null;
  }
  set crossOrigin(_value: string | null) {}

  canPlayType(type: string) {
    return type === 'video/remotion' ? ('probably' as const) : ('' as const);
  }

  /** Re-announce the current source. The wrapper remounts `<Player>` when `source` changes, which re-attaches. */
  async load() {
    this.#resetPlaybackState();
    this.dispatchEvent(new Event('emptied'));

    if (!this.#source) {
      this.#syncChapters();
      this.#syncSubtitles();
      return;
    }

    // Chapters are in place before `loadstart`, which is when the text-track feature re-reads the list.
    this.#syncChapters();
    this.#syncSubtitles();
    this.dispatchEvent(new Event('loadstart'));

    if (this.#player) this.#announceLoaded();
  }

  #announceLoaded() {
    if (!this.#source) return;

    // Compositions are code: once the Player is mounted every frame is renderable, so metadata and "enough data"
    // arrive together. `waiting`/`resume` from embedded media lower and restore `readyState` afterwards.
    this.#readyState = MediaReadyState.HAVE_ENOUGH_DATA;

    for (const type of [
      'loadedmetadata',
      'durationchange',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'volumechange',
    ]) {
      this.dispatchEvent(new Event(type));
    }
  }

  #resetPlaybackState() {
    this.#paused = true;
    this.#ended = false;
    this.#seeking = false;
    this.#buffering = false;
    this.#currentTime = 0;
    this.#readyState = MediaReadyState.HAVE_NOTHING;
    this.#error = null;
    this.#swallowPause = 0;
    this.#swallowPlay = 0;
  }

  // ----------------------------------------
  // Playback
  // ----------------------------------------

  get paused() {
    return this.#paused;
  }

  get ended() {
    return this.#ended;
  }

  get seeking() {
    return this.#seeking;
  }

  async play() {
    // A deliberate play must never be swallowed as a seek-resume.
    this.#swallowPlay = 0;

    if (!this.#player) {
      // Nothing mounted yet; the store reads `paused` optimistically and the Player autoplays on mount.
      this.#autoplay = true;
      return;
    }

    this.#player.play();
  }

  pause() {
    this.#swallowPause = 0;
    this.#player?.pause();
  }

  get currentTime() {
    return this.#currentTime;
  }
  set currentTime(value) {
    const frame = this.#timeToFrame(value);
    const snapped = this.#frameToTime(frame);
    if (snapped === this.#currentTime && !this.#seeking) return;

    this.#seeking = true;
    // Like a media element, leaving the end clears `ended`.
    this.#ended = false;
    this.#currentTime = snapped;
    this.dispatchEvent(new Event('seeking'));

    const player = this.#player;

    if (!player) {
      this.#seeking = false;
      this.dispatchEvent(new Event('timeupdate'));
      this.dispatchEvent(new Event('seeked'));
      return;
    }

    if (player.isPlaying()) {
      this.#swallowPause++;
      this.#swallowPlay++;
    }

    this.#seekTargetFrame = frame;
    player.seekTo(frame);
  }

  #finishSeek() {
    if (!this.#seeking) return;

    this.#seeking = false;
    this.#seekTargetFrame = -1;
    this.dispatchEvent(new Event('seeked'));
  }

  get duration() {
    const source = this.#source;

    return source ? source.durationInFrames / source.fps : Number.NaN;
  }

  get loop() {
    return this.#loop;
  }
  set loop(value) {
    if (this.#loop === value) return;

    this.#loop = value;
    this.#notifyPlayerProps();
  }

  get autoplay() {
    return this.#autoplay;
  }
  set autoplay(value) {
    this.#autoplay = value;
  }

  // ----------------------------------------
  // Volume
  // ----------------------------------------

  get volume() {
    return this.#volume;
  }
  set volume(value) {
    if (this.#volume === value) return;

    this.#volume = value;

    if (this.#player) this.#player.setVolume(value);
    else {
      this.#notifyPlayerProps();
      this.dispatchEvent(new Event('volumechange'));
    }
  }

  get muted() {
    return this.#muted;
  }
  set muted(value) {
    if (this.#muted === value) return;

    this.#muted = value;

    if (this.#player) {
      if (value) this.#player.mute();
      else this.#player.unmute();
    } else {
      this.#notifyPlayerProps();
      this.dispatchEvent(new Event('volumechange'));
    }
  }

  get defaultMuted() {
    return this.#defaultMuted;
  }
  set defaultMuted(value) {
    if (this.#defaultMuted === value) return;

    this.#defaultMuted = value;
    this.#notifyPlayerProps();
  }

  // ----------------------------------------
  // Rate
  // ----------------------------------------

  get playbackRate() {
    return this.#playbackRate;
  }
  set playbackRate(value) {
    if (this.#playbackRate === value) return;

    // Remotion takes the rate as a `<Player>` prop and answers with `ratechange` once it applies.
    this.#playbackRate = value;
    this.#notifyPlayerProps();
  }

  get defaultPlaybackRate() {
    return 1;
  }
  set defaultPlaybackRate(_value: number) {}

  // ----------------------------------------
  // Ranges, tracks, and other opt-outs
  // ----------------------------------------

  // A composition is fully addressable once mounted; there is no byte buffer to report.
  get buffered() {
    return this.#player && this.duration > 0 ? createTimeRange(0, this.duration) : EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.duration > 0 ? createTimeRange(0, this.duration) : EMPTY_TIME_RANGES;
  }

  // A composition has no native track list, so a detached `<video>` hosts one (the YouTube adapter does the same for
  // caption metadata). Chapters are the one track a composition can vouch for: its scenes are known up front.
  #textTracksHost: HTMLVideoElement | null = null;
  #chaptersTrack: TextTrack | null = null;
  #subtitlesTrack: TextTrack | null = null;

  #syncSubtitles() {
    const subtitles = this.#source?.subtitles;
    const host = (this.#textTracksHost ??= globalThis.document?.createElement('video') ?? null);
    if (!host) return;

    // Created on first use, so a composition without captions leaves the captions menu empty.
    if (!subtitles && !this.#subtitlesTrack) return;

    const track = (this.#subtitlesTrack ??= host.addTextTrack('subtitles', subtitles?.label, subtitles?.language));

    // Cues are only enumerable while the track is not disabled; restore the mode afterwards so the menu state holds.
    const mode = track.mode;

    track.mode = 'hidden';

    for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);

    for (const cue of subtitles?.cues ?? []) track.addCue(new VTTCue(cue.startMs / 1000, cue.endMs / 1000, cue.text));

    track.mode = mode === 'showing' ? 'showing' : 'disabled';
  }

  get textTracks() {
    this.#textTracksHost ??= globalThis.document?.createElement('video') ?? null;

    return (this.#textTracksHost?.textTracks as TextTrackListLike | undefined) ?? EMPTY_TEXT_TRACKS;
  }

  #syncChapters() {
    const source = this.#source;
    const host = (this.#textTracksHost ??= globalThis.document?.createElement('video') ?? null);
    if (!host) return;

    // One track for the adapter's lifetime: a `TextTrack` cannot be removed from its list, so its cues are replaced.
    const track = (this.#chaptersTrack ??= host.addTextTrack('chapters', 'Scenes'));

    // Cues are only readable while the track is not disabled.
    track.mode = 'hidden';

    for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);

    if (!source?.chapters?.length) return;

    const chapters = [...source.chapters].sort((a, b) => a.from - b.from);

    chapters.forEach((chapter, index) => {
      const start = chapter.from / source.fps;
      const endFrame = chapter.durationInFrames
        ? chapter.from + chapter.durationInFrames
        : (chapters[index + 1]?.from ?? source.durationInFrames);

      track.addCue(new VTTCue(start, endFrame / source.fps, chapter.title));
    });
  }

  get error() {
    return this.#error;
  }

  get videoWidth() {
    return this.#source?.compositionWidth ?? 0;
  }

  get videoHeight() {
    return this.#source?.compositionHeight ?? 0;
  }

  get controls() {
    return this.#controls;
  }
  set controls(value) {
    this.#controls = value;
  }

  get playsInline() {
    return this.#playsInline;
  }
  set playsInline(value) {
    this.#playsInline = value;
  }

  get poster() {
    return this.#poster;
  }
  set poster(value) {
    this.#poster = value;
  }

  // Fullscreen and picture-in-picture are deliberately absent: the player's container owns fullscreen, and a
  // composition is a `<div>`, so PiP reports as unsupported and its button hides.

  // ----------------------------------------
  // Remotion → media events
  // ----------------------------------------

  #bindPlayerEvents(player: PlayerRef) {
    const emit = (type: string) => this.dispatchEvent(new Event(type));
    const on = <T extends EventTypes>(type: T, listener: CallbackListener<T>) => {
      player.addEventListener(type, listener);
      return () => player.removeEventListener(type, listener);
    };

    const offs = [
      on('play', () => {
        if (this.#swallowPlay > 0) {
          this.#swallowPlay--;
          return;
        }

        this.#paused = false;
        this.#ended = false;
        emit('play');

        if (!this.#buffering) emit('playing');
      }),
      on('pause', () => {
        if (this.#swallowPause > 0) {
          this.#swallowPause--;
          return;
        }

        this.#paused = true;
        emit('pause');
      }),
      on('ended', () => {
        this.#swallowPause = 0;
        this.#swallowPlay = 0;
        this.#paused = true;
        this.#ended = true;
        // Seeking onto the last frame ends without a `seeked`; a media element still finishes the seek first.
        this.#finishSeek();
        emit('ended');
      }),
      on('seeked', (event) => {
        this.#currentTime = this.#frameToTime(event.detail.frame);
        emit('timeupdate');
        this.#finishSeek();
      }),
      on('frameupdate', (event) => {
        const time = this.#frameToTime(event.detail.frame);

        if (time !== this.#currentTime) {
          this.#currentTime = time;
          emit('timeupdate');
        }

        // The frame we asked for has rendered; whether Remotion announced it as a seek or not, it is done.
        if (this.#seeking && event.detail.frame === this.#seekTargetFrame) this.#finishSeek();
      }),
      on('waiting', () => {
        this.#buffering = true;
        this.#readyState = MediaReadyState.HAVE_CURRENT_DATA;
        emit('waiting');
      }),
      on('resume', () => {
        this.#buffering = false;
        this.#readyState = MediaReadyState.HAVE_ENOUGH_DATA;

        if (!this.#paused) emit('playing');
      }),
      on('volumechange', (event) => {
        this.#volume = event.detail.volume;
        emit('volumechange');
      }),
      on('mutechange', (event) => {
        this.#muted = event.detail.isMuted;
        emit('volumechange');
      }),
      on('ratechange', (event) => {
        this.#playbackRate = event.detail.playbackRate;
        emit('ratechange');
      }),
      on('error', (event) => {
        this.#error = new MediaError(event.detail.error.message, MediaError.MEDIA_ERR_CUSTOM, true);
        emit('error');
      }),
    ];

    this.#unbind = () => {
      for (const off of offs) off();
    };
  }

  #frameToTime(frame: number) {
    const fps = this.#source?.fps ?? 30;

    return frame / fps;
  }

  #timeToFrame(time: number) {
    const source = this.#source;
    if (!source) return 0;

    const frame = Math.round(time * source.fps);

    return Math.min(Math.max(frame, 0), source.durationInFrames - 1);
  }
}
