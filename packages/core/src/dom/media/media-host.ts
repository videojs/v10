import { EMPTY_TIME_RANGES } from '@videojs/utils/dom';
import {
  type ErrorLike,
  type EventLike,
  type EventTargetLike,
  type MediaRemotePlaybackHost,
  type MediaRemotePlaybackTarget,
  type RemotePlaybackLike,
  TypedEventTarget,
} from '../../core/media/types';
import {
  isMediaPauseCapable,
  isMediaPlaybackCapable,
  isMediaPlaybackRateCapable,
  isMediaRemotePlaybackCapable,
  isMediaRemoteTarget,
  isMediaSeekCapable,
  isMediaSourceCapable,
  isMediaVolumeCapable,
} from './predicate';

export class HTMLMediaElementHost<
    T extends HTMLMediaElement,
    Events extends { [K in keyof Events]: EventLike<unknown> },
  >
  // TODO(rahim): Use generic type for Events, need to fix
  extends TypedEventTarget<any>()
  implements EventTargetLike<Events>, MediaRemotePlaybackHost
{
  #target: T | null = null;
  #types = new Set<string>();
  #remoteTarget: MediaRemotePlaybackTarget | null = null;

  get target() {
    return this.#target;
  }

  attach(target: T): void {
    if (!target || this.#target === target) return;

    this.#target = target;

    for (const type of this.#types) {
      target.addEventListener(type, this.#forwardEvent);
    }
  }

  detach(): void {
    if (!this.#target) return;

    for (const type of this.#types) {
      this.#target.removeEventListener(type, this.#forwardEvent);
    }

    this.#target = null;
  }

  destroy(): void {
    this.detach();
    this.setRemoteMedia(null);
  }

  #forwardEvent = (event: Event) => {
    const ctor = event.constructor as typeof Event;
    this.dispatchEvent(new ctor(event.type, event));
  };

  // -- Metadata --

  get title() {
    return this.target?.title ?? '';
  }

  set title(value: string) {
    if (this.target) this.target.title = value;
  }

  // -- Playback --

  get paused() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaPauseCapable(remote)) return remote.paused;
    return this.target?.paused ?? true;
  }

  get ended() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaPauseCapable(remote)) return remote.ended;
    return this.target?.ended ?? false;
  }

  get loop() {
    return this.target?.loop ?? false;
  }

  set loop(value: boolean) {
    if (this.target) this.target.loop = value;
  }

  play(): Promise<void> {
    const remote = this.getActiveRemoteTarget();
    if (isMediaPlaybackCapable(remote)) return Promise.resolve(remote.play()).then(() => {});
    return this.target?.play() ?? Promise.reject();
  }

  pause() {
    const remote = this.getActiveRemoteTarget();

    if (isMediaPauseCapable(remote)) {
      remote.pause();
      return;
    }

    this.target?.pause();
  }

  // -- Time --

  get currentTime() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaSeekCapable(remote)) return remote.currentTime;
    return this.target?.currentTime ?? 0;
  }

  set currentTime(value: number) {
    const remote = this.getActiveRemoteTarget();

    if (isMediaSeekCapable(remote)) {
      remote.currentTime = value;
      return;
    }

    if (this.target) this.target.currentTime = value;
  }

  get duration() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaSeekCapable(remote)) return remote.duration;
    return this.target?.duration ?? NaN;
  }

  get seeking() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaSeekCapable(remote)) return remote.seeking;
    return this.target?.seeking ?? false;
  }

  // -- Source --

  get src() {
    return this.target?.src ?? '';
  }

  set src(value: string) {
    if (this.target) this.target.src = value;
  }

  get currentSrc() {
    return this.target?.currentSrc ?? '';
  }

  get readyState() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaSourceCapable(remote)) return remote.readyState;
    return this.target?.readyState ?? 0;
  }

  load() {
    const remote = this.getActiveRemoteTarget();

    if (isMediaSourceCapable(remote)) {
      remote.load();
      return;
    }

    this.target?.load();
  }

  // -- Volume --

  get volume() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaVolumeCapable(remote)) return remote.volume;
    return this.target?.volume ?? 1;
  }

  set volume(value: number) {
    const remote = this.getActiveRemoteTarget();

    if (isMediaVolumeCapable(remote)) {
      remote.volume = value;
      return;
    }

    if (this.target) this.target.volume = value;
  }

  get muted() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaVolumeCapable(remote)) return remote.muted;
    return this.target?.muted ?? false;
  }

  set muted(value: boolean) {
    const remote = this.getActiveRemoteTarget();

    if (isMediaVolumeCapable(remote)) {
      remote.muted = value;
      return;
    }

    if (this.target) this.target.muted = value;
  }

  // -- Playback rate --

  get playbackRate() {
    const remote = this.getActiveRemoteTarget();
    if (isMediaPlaybackRateCapable(remote)) return remote.playbackRate;
    return this.target?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
    const remote = this.getActiveRemoteTarget();

    if (isMediaPlaybackRateCapable(remote)) {
      remote.playbackRate = value;
      return;
    }

    if (this.target) this.target.playbackRate = value;
  }

  // -- Buffer --

  get buffered(): TimeRanges {
    return this.target?.buffered ?? EMPTY_TIME_RANGES;
  }

  get seekable(): TimeRanges {
    return this.target?.seekable ?? EMPTY_TIME_RANGES;
  }

  // -- Error --

  get error(): ErrorLike | null {
    return this.target?.error ?? null;
  }

  // -- Text tracks --

  get textTracks() {
    return (this.target?.textTracks as TextTrackList) ?? [];
  }

  // -- Remote playback --

  get remote(): RemotePlaybackLike | null {
    if (
      isMediaRemoteTarget(this.#remoteTarget) &&
      this.#remoteTarget.supported &&
      isMediaRemotePlaybackCapable(this.#remoteTarget)
    ) {
      return this.#remoteTarget.remote;
    }

    return this.target?.remote ?? null;
  }

  get remoteTarget(): MediaRemotePlaybackTarget | null {
    return this.#remoteTarget;
  }

  get disableRemotePlayback() {
    return this.target?.disableRemotePlayback ?? false;
  }

  set disableRemotePlayback(value: boolean) {
    if (this.target) this.target.disableRemotePlayback = value;
  }

  getActiveRemoteTarget(): MediaRemotePlaybackTarget | null {
    if (!this.#remoteTarget) return null;
    if (!isMediaRemoteTarget(this.#remoteTarget) || !this.#remoteTarget.supported) return null;
    return this.#remoteTarget.active ? this.#remoteTarget : null;
  }

  setRemoteMedia(media: MediaRemotePlaybackTarget | null): void {
    const previous = this.#remoteTarget;
    if (previous === media) return;

    previous?.setLocalMedia?.(null);
    this.#remoteTarget = media;
    media?.setLocalMedia?.(this);

    this.dispatchEvent(
      new CustomEvent('remotetargetchange', {
        detail: {
          remoteTarget: this.#remoteTarget,
          remote: this.remote,
        },
      })
    );
  }
}
