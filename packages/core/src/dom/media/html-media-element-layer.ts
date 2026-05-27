import { MediaLayer } from '../../core/media/media-layer';
import type { EventLike, MediaFull, MediaFullEvents } from '../../core/media/types';
import { MediaStreamTypes } from '../../core/media/types';
import { EMPTY_CONFIG, EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from './constants';

export abstract class HTMLMediaElementLayer<Events extends { [K in keyof Events]: EventLike } = MediaFullEvents>
  extends MediaLayer<MediaFull, Events>
  implements MediaFull
{
  // -- Extensions --

  override get root() {
    return super.root as HTMLMediaElementLayer<Events>;
  }

  override get target() {
    return super.target as HTMLMediaElement | null;
  }

  override set target(value: HTMLMediaElement | null) {
    super.target = value;
  }

  get engine() {
    return this.next?.engine ?? null;
  }

  get streamType() {
    return this.next?.streamType ?? MediaStreamTypes.UNKNOWN;
  }

  set streamType(value) {
    if (this.next) this.next.streamType = value;
  }

  get liveEdgeStart() {
    return this.next?.liveEdgeStart ?? Number.NaN;
  }

  get targetLiveWindow() {
    return this.next?.targetLiveWindow ?? Number.NaN;
  }

  get config() {
    return this.next?.config ?? EMPTY_CONFIG;
  }

  set config(value) {
    if (this.next) this.next.config = value;
  }

  // -- Playback --

  async play() {
    return this.next?.play() ?? Promise.reject();
  }

  pause() {
    this.next?.pause();
  }

  get paused() {
    return this.next?.paused ?? true;
  }

  get ended() {
    return this.next?.ended ?? false;
  }

  // -- Seek --

  get currentTime() {
    return this.next?.currentTime ?? 0;
  }

  set currentTime(value) {
    if (this.next) this.next.currentTime = value;
  }

  get loop() {
    return this.next?.loop ?? false;
  }

  set loop(value) {
    if (this.next) this.next.loop = value;
  }

  get duration() {
    return this.next?.duration ?? NaN;
  }

  get seeking() {
    return this.next?.seeking ?? false;
  }

  // -- Source --

  get src() {
    return this.next?.src ?? '';
  }

  set src(value) {
    if (this.next) this.next.src = value;
  }

  get currentSrc() {
    return this.next?.currentSrc ?? '';
  }

  get readyState() {
    return this.next?.readyState ?? 0;
  }

  get preload() {
    return this.next?.preload ?? 'metadata';
  }

  set preload(value) {
    if (this.next) this.next.preload = value;
  }

  load() {
    return this.next?.load();
  }

  // -- Volume --

  get volume() {
    return this.next?.volume ?? 1;
  }

  set volume(value) {
    if (this.next) this.next.volume = value;
  }

  get muted() {
    return this.next?.muted ?? false;
  }

  set muted(value) {
    if (this.next) this.next.muted = value;
  }

  // -- Playback rate --

  get playbackRate() {
    return this.next?.playbackRate ?? 1;
  }

  set playbackRate(value) {
    if (this.next) this.next.playbackRate = value;
  }

  // -- Playback options --

  get autoplay() {
    return this.next?.autoplay ?? false;
  }

  set autoplay(value) {
    if (this.next) this.next.autoplay = value;
  }

  get defaultMuted() {
    return this.next?.defaultMuted ?? false;
  }

  set defaultMuted(value) {
    if (this.next) this.next.defaultMuted = value;
  }

  get controls() {
    return this.next?.controls ?? false;
  }

  set controls(value) {
    if (this.next) this.next.controls = value;
  }

  // -- Buffer --

  get buffered() {
    return this.next?.buffered ?? EMPTY_TIME_RANGES;
  }

  get seekable() {
    return this.next?.seekable ?? EMPTY_TIME_RANGES;
  }

  // -- Error --

  get error() {
    return this.next?.error ?? null;
  }

  // -- Text tracks --

  get textTracks() {
    return this.next?.textTracks ?? EMPTY_TEXT_TRACKS;
  }

  // -- Remote playback --

  get remote() {
    return this.next?.remote ?? EMPTY_REMOTE;
  }

  get disableRemotePlayback() {
    return this.next?.disableRemotePlayback ?? false;
  }

  set disableRemotePlayback(value) {
    if (this.next) this.next.disableRemotePlayback = value;
  }
}
