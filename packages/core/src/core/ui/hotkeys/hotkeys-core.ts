// Modeled after YouTube's keyboard shortcuts (Mar 17, 2026).
import type {
  MediaBufferState,
  MediaFullscreenState,
  MediaPlaybackRateState,
  MediaPlaybackState,
  MediaTextTrackState,
  MediaTimeState,
  MediaVolumeState,
} from '../../media/state';

export type HotkeysMedia = Partial<
  MediaPlaybackState &
    MediaVolumeState &
    MediaTimeState &
    MediaBufferState &
    MediaFullscreenState &
    MediaTextTrackState &
    MediaPlaybackRateState
>;

// TODO: Maybe make these configurable?
const SEEK_SMALL = 5;
const SEEK_LARGE = 10;
const VOLUME_STEP = 0.05;
const RATE_STEP = 0.25;
const RATE_MIN = 0.25;
const RATE_MAX = 2;

export class HotkeysCore {
  #media: HotkeysMedia | null = null;

  #keydownActions: Record<string, () => boolean> = {
    ' ': () => this.#handleSpaceDown(),
    k: () => this.#togglePaused(),
    f: () => this.#toggleFullscreen(),
    c: () => this.#toggleCaptions(),
    m: () => this.#toggleMuted(),
    ArrowLeft: () => this.#seekBy(-SEEK_SMALL),
    ArrowRight: () => this.#seekBy(SEEK_SMALL),
    j: () => this.#seekBy(-SEEK_LARGE),
    l: () => this.#seekBy(SEEK_LARGE),
    ArrowUp: () => this.#setVolumeBy(VOLUME_STEP),
    ArrowDown: () => this.#setVolumeBy(-VOLUME_STEP),
    '<': () => this.#setPlaybackRateBy(-RATE_STEP),
    '>': () => this.#setPlaybackRateBy(RATE_STEP),
  };

  #keyupActions: Record<string, () => boolean> = {
    ' ': () => this.#handleSpaceUp(),
  };

  get media() {
    return this.#media;
  }

  setMedia(media: HotkeysMedia | Record<string, unknown> | null): void {
    this.#media = media as HotkeysMedia | null;
  }

  handleKeydown(key: string): boolean {
    const action = this.#keydownActions[key];
    if (!action) return false;
    return action();
  }

  handleKeyup(key: string): boolean {
    const action = this.#keyupActions[key];
    if (!action) return false;
    return action();
  }

  #handleSpaceDown() {
    // TODO: Maybe handle long press of space key to set playback rate to 2.0.
    return this.#togglePaused();
  }

  #handleSpaceUp() {
    return false;
  }

  #togglePaused() {
    const { media } = this;
    if (!media?.play || !media.pause) return false;
    if (media.paused || media.ended) {
      media.play();
    } else {
      media.pause();
    }
    return true;
  }

  #toggleFullscreen() {
    const { media } = this;
    if (!media?.requestFullscreen || !media.exitFullscreen) return false;
    if (media.fullscreen) {
      media.exitFullscreen();
    } else {
      media.requestFullscreen();
    }
    return true;
  }

  #toggleCaptions() {
    const { media } = this;
    if (!media?.toggleSubtitles) return false;
    media.toggleSubtitles();
    return true;
  }

  #toggleMuted() {
    const { media } = this;
    if (!media?.toggleMuted) return false;
    media.toggleMuted();
    return true;
  }

  #seekBy(delta: number): boolean {
    const { media } = this;
    if (!media?.seek || media.currentTime == null) return false;
    media.seek(media.currentTime! + delta);
    return true;
  }

  #setVolumeBy(delta: number): boolean {
    const { media } = this;
    if (!media?.setVolume || media.volume == null) return false;
    const next = Math.min(1, Math.max(0, media.volume + delta));
    media.setVolume(next);
    return true;
  }

  #setPlaybackRateBy(delta: number): boolean {
    const { media } = this;
    if (!media?.setPlaybackRate || media.playbackRate == null) return false;
    const next = Math.min(RATE_MAX, Math.max(RATE_MIN, media.playbackRate + delta));
    media.setPlaybackRate(next);
    return true;
  }
}
