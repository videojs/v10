import type { PlaybackEngine } from '@/media/engine/hls-engine';
import { createHlsPlaybackEngine } from '@/media/engine/hls-engine';

/** @TODO Split out "playable" vs. "audible" vs. "temporal" and compose via factory (current mixin pattern or spreadable mixin pattern) (CJP) */
export const Events = [
  'volumechange',
  'pause',
  'play',
  'playing',
  'emptied',
  'loadedmetadata',
  'timeupdate',
  'durationchange',
] as const;

export interface MediaStateOwner extends EventTarget, Pick<HTMLMediaElement, 'src'> {
  mediaElement?: HTMLMediaElement | undefined;
}

export interface PlayableMediaStateOwner
  extends EventTarget,
  MediaStateOwner,
  Pick<HTMLMediaElement, 'play' | 'pause' | 'paused'> {}

export interface AudibleMediaStateOwner
  extends EventTarget,
  MediaStateOwner,
  Pick<HTMLMediaElement, 'muted' | 'volume'> {}

export interface TemporalMediaStateOwner
  extends EventTarget,
  MediaStateOwner,
  Pick<HTMLMediaElement, 'duration' | 'currentTime'> {}

export class MediaPlaybackController extends EventTarget implements MediaStateOwner, PlayableMediaStateOwner, AudibleMediaStateOwner {
  protected _playbackEngine: PlaybackEngine;

  constructor() {
    super();
    this._playbackEngine = createHlsPlaybackEngine();
  }

  get mediaElement(): HTMLMediaElement | undefined {
    return this._playbackEngine.mediaElement;
  }

  set mediaElement(value) {
    if (this.mediaElement === value) return;

    if (this.mediaElement != null) {
      Events.forEach((eventType) => {
        this.mediaElement?.removeEventListener(eventType, this);
      });
    }

    this._playbackEngine.mediaElement = value;

    if (this.mediaElement) {
      Events.forEach((eventType) => {
        this.mediaElement?.addEventListener(eventType, this);
      });
    }
  }

  get paused(): boolean {
    return this.mediaElement?.paused ?? false;
  }

  pause(): void {
    /** @TODO implement deferred state etc. for cases where media has yet to be set */
    if (!this.mediaElement) return;
    return this.mediaElement.pause();
  }

  play(): Promise<void> {
    /** @TODO implement deferred state etc. for cases where media has yet to be set */
    if (!this.mediaElement) throw new Error('No media element is set');
    return this.mediaElement.play();
  }

  get muted(): boolean {
    return this.mediaElement?.muted ?? false;
  }

  set muted(value: boolean) {
    if (value === this.muted) return;
    /** @TODO implement deferred state etc. for cases where media has yet to be set */
    if (!this.mediaElement) return;
    this.mediaElement.muted = value;
  }

  get volume(): number {
    return this.mediaElement?.volume ?? 0;
  }

  set volume(value: number) {
    if (value === this.volume) return;
    /** @TODO implement deferred state etc. for cases where media has yet to be set */
    if (!this.mediaElement) return;
    this.mediaElement.volume = value;
  }

  get duration(): number {
    return this.mediaElement?.duration ?? 0;
  }

  get currentTime(): number {
    return this.mediaElement?.currentTime ?? 0;
  }

  set currentTime(value: number) {
    if (value === this.currentTime) return;
    /** @TODO implement deferred state etc. for cases where media has yet to be set */
    if (!this.mediaElement) return;
    this.mediaElement.currentTime = value;
  }

  get src(): string {
    return this._playbackEngine.src ?? '';
  }

  set src(value: string) {
    this._playbackEngine.src = value;
  }

  handleEvent(event: Event): void {
    if (event.target === this.mediaElement) {
      const clonedEvent = new (event.constructor as (typeof globalThis)['Event'])(event.type, event);
      this.dispatchEvent(clonedEvent);
    }
  }

  destroy(): void {
    this._playbackEngine.destroy();
  }
}

export const createMediaPlaybackController = (): MediaPlaybackController => new MediaPlaybackController();
