import type { EventListenerFor, EventType } from '@videojs/utils/dom';

import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import {
  type EventLike,
  type MediaFull,
  type MediaStreamType,
  MediaStreamTypes,
  type TextTrackKind,
  type TextTrackLike,
} from '../../core/types';
import { getMediaOwner, getMediaProp, setMediaProp } from '../utils';
import { MediaHostBase } from './base';
import { volumeCapability } from './capabilities/volume';
import { createMediaHost } from './capability';

export {
  addMediaComponent,
  getMediaComponents,
  getMediaOwner,
  getMediaProp,
  mediaPropsFor,
  setMediaProp,
} from '../utils';
export { type HTMLMediaTargetLike, MediaHostBase } from './base';
export { volumeCapability } from './capabilities/volume';
export {
  type ComposedMediaApi,
  createMediaHost,
  defineMediaCapability,
  getMediaCapabilities,
  getMediaCapabilityAttributes,
  getMediaCapabilityEvents,
  type MediaCapabilityAttribute,
  type MediaCapabilityDescriptor,
  type MediaCapabilityProp,
  type MediaHostConstructor,
  supportsMediaCapability,
} from './capability';

import type { HTMLMediaTargetLike } from './base';

export interface MediaComponent<Target extends HTMLMediaTargetLike = HTMLMediaTargetLike> {
  readonly targetOverride?: Partial<Target> | null;
  setMedia?(host: MediaHostBase): void;
  attach?(target: Target): void;
  detach?(): void;
  destroy?(): void;
}

export interface MediaComponentConstructor<T extends MediaComponent = MediaComponent> {
  new (...args: any[]): T;
}

export interface MediaComponents extends Map<MediaComponentConstructor, MediaComponent> {
  get<T extends MediaComponent>(component: MediaComponentConstructor<T>): T | undefined;
  set<T extends MediaComponent>(component: MediaComponentConstructor<T>, instance: T): this;
}

/**
 * The capability manifest `HTMLMediaElementHost` is built from.
 *
 * Only volume has been described so far; the remaining capabilities still live in the class body below and move out one
 * at a time.
 */
const HTMLMediaElementHostBase = createMediaHost([volumeCapability]);

export class HTMLMediaElementHost<Target extends HTMLMediaTargetLike, Events extends { [K in keyof Events]: EventLike }>
  extends HTMLMediaElementHostBase
  implements MediaFull
{
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;

  /** Narrows the base host's target to the shape this host was parameterized with. */
  protected override get target(): Target | null {
    return super.target as Target | null;
  }

  override attach(target: Target): void {
    super.attach(target);
  }

  override addEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | AddEventListenerOptions
  ) {
    super.addEventListener(type, listener as EventListener, options);
  }

  override removeEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | EventListenerOptions
  ) {
    super.removeEventListener(type, listener as EventListener, options);
  }

  /**
   * Current stream type (`'on-demand'`, `'live'`, or `'unknown'`). Defaults to `'unknown'`; detecting hosts update it
   * automatically, and consumers can set it to override detection.
   */
  get streamType() {
    return getMediaProp(this, 'streamType') ?? this.#streamType;
  }
  set streamType(value) {
    if (this.streamType === value) return;

    this.#streamType = value;
    setMediaProp(this, 'streamType', value);
    this.dispatchEvent(new Event('streamtypechange'));
  }

  get liveEdgeStart() {
    return getMediaProp(this, 'liveEdgeStart') ?? Number.NaN;
  }

  get targetLiveWindow() {
    return getMediaProp(this, 'targetLiveWindow') ?? Number.NaN;
  }

  get contentData() {
    return getMediaProp(this, 'contentData');
  }

  get title() {
    return getMediaProp(this, 'title') ?? '';
  }
  set title(value) {
    setMediaProp(this, 'title', value);
  }

  get controls() {
    return getMediaProp(this, 'controls') ?? false;
  }
  set controls(value) {
    setMediaProp(this, 'controls', value);
  }

  get paused() {
    return getMediaProp(this, 'paused') ?? true;
  }

  get ended() {
    return getMediaProp(this, 'ended') ?? false;
  }

  get loop() {
    return getMediaProp(this, 'loop') ?? false;
  }
  set loop(value) {
    setMediaProp(this, 'loop', value);
  }

  play() {
    const owner = getMediaOwner(this, 'play');

    return owner?.play?.() ?? Promise.reject(new DOMException('No media is attached.', 'NotSupportedError'));
  }

  pause() {
    const owner = getMediaOwner(this, 'pause');

    owner?.pause?.();
  }

  get autoplay() {
    return getMediaProp(this, 'autoplay') ?? false;
  }
  set autoplay(value) {
    setMediaProp(this, 'autoplay', value);
  }

  get currentTime() {
    return getMediaProp(this, 'currentTime') ?? 0;
  }
  set currentTime(value) {
    setMediaProp(this, 'currentTime', value);
  }

  get duration() {
    return getMediaProp(this, 'duration') ?? NaN;
  }

  get seeking() {
    return getMediaProp(this, 'seeking') ?? false;
  }

  get src() {
    return getMediaProp(this, 'src') ?? '';
  }
  set src(value) {
    setMediaProp(this, 'src', value);
  }

  get currentSrc() {
    return getMediaProp(this, 'currentSrc') ?? '';
  }

  get readyState() {
    return getMediaProp(this, 'readyState') ?? 0;
  }

  get preload() {
    return getMediaProp(this, 'preload') ?? 'metadata';
  }
  set preload(value) {
    setMediaProp(this, 'preload', value);
  }

  get crossOrigin() {
    return getMediaProp(this, 'crossOrigin') ?? null;
  }
  set crossOrigin(value) {
    setMediaProp(this, 'crossOrigin', value);
  }

  load() {
    const owner = getMediaOwner(this, 'load');

    return owner?.load?.();
  }

  canPlayType(type: string) {
    const owner = getMediaOwner(this, 'canPlayType');

    return owner?.canPlayType?.(type) ?? '';
  }

  get playbackRate() {
    return getMediaProp(this, 'playbackRate') ?? 1;
  }
  set playbackRate(value) {
    setMediaProp(this, 'playbackRate', value);
  }

  get defaultPlaybackRate() {
    return getMediaProp(this, 'defaultPlaybackRate') ?? 1;
  }
  set defaultPlaybackRate(value) {
    setMediaProp(this, 'defaultPlaybackRate', value);
  }

  get buffered() {
    return (getMediaProp(this, 'buffered') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get seekable() {
    return (getMediaProp(this, 'seekable') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get played() {
    return (getMediaProp(this, 'played') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get error() {
    return getMediaProp(this, 'error') ?? null;
  }

  get textTracks() {
    return (getMediaProp(this, 'textTracks') ?? EMPTY_TEXT_TRACKS) as TextTrackList;
  }

  addTextTrack(kind: TextTrackKind, label?: string, language?: string) {
    const owner = getMediaOwner(this, 'addTextTrack');

    return owner?.addTextTrack?.(kind, label, language) as TextTrackLike;
  }

  get remote() {
    return getMediaProp(this, 'remote') ?? EMPTY_REMOTE;
  }

  get disableRemotePlayback() {
    return getMediaProp(this, 'disableRemotePlayback') ?? false;
  }
  set disableRemotePlayback(value) {
    setMediaProp(this, 'disableRemotePlayback', value);
  }
}
