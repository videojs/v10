import type { EventListenerFor, EventType, QueriedElement } from '@videojs/utils/dom';
import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/constants';
import {
  type EventLike,
  type MediaFull,
  type MediaStreamType,
  MediaStreamTypes,
  type MediaTargetLike,
  type TextTrackKind,
  type TextTrackLike,
} from '../../core/types';
import { getMediaComponents, getMediaOwner, getMediaProp, setMediaProp } from '../utils';

export {
  addMediaComponent,
  getMediaComponents,
  getMediaOwner,
  getMediaProp,
  setMediaProp,
} from '../utils';

export interface HTMLMediaTargetLike extends MediaTargetLike, EventTarget {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
}

export interface MediaComponent<Target extends HTMLMediaTargetLike = HTMLMediaTargetLike> {
  readonly targetOverride?: Partial<Target> | null;
  setMedia?(host: HTMLMediaElementHost<Target, any>): void;
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

export class HTMLMediaElementHost<Target extends HTMLMediaTargetLike, Events extends { [K in keyof Events]: EventLike }>
  extends EventTarget
  implements MediaFull
{
  #target: Target | null = null;
  #eventTypes = new Set<string>();
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;

  protected get target() {
    return this.#target;
  }

  attach(target: Target) {
    if (!target || this.#target === target) return;
    this.#target = target;

    for (const type of this.#eventTypes) {
      target.addEventListener(type, this.#forwardEvent);
    }

    for (const component of getMediaComponents(this).values()) {
      component.attach?.(target);
    }
  }

  detach() {
    if (!this.#target) return;

    for (const component of getMediaComponents(this).values()) {
      component.detach?.();
    }

    for (const type of this.#eventTypes) {
      this.#target.removeEventListener(type, this.#forwardEvent);
    }

    this.#target = null;
  }

  destroy() {
    this.detach();
    this.#eventTypes.clear();
    // Media components are owned by whoever registered them (e.g. `<mux-data>`,
    // `<google-cast>`), which may outlive this host. `detach()` above releases
    // them from the target, so only drop the registrations here and leave
    // destruction to the owner.
    getMediaComponents(this).clear();
  }

  querySelectorAll<E extends Element = Element, S extends string = string>(selectors: S) {
    return (this.target?.querySelectorAll(selectors) ?? []) as NodeListOf<QueriedElement<S, E>> | never[];
  }

  querySelector<E extends Element = Element, S extends string = string>(selectors: S) {
    return (this.target?.querySelector(selectors) ?? null) as QueriedElement<S, E> | null;
  }

  addEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | AddEventListenerOptions
  ) {
    if (!this.#eventTypes.has(type)) {
      this.#eventTypes.add(type);
      this.target?.addEventListener(type, this.#forwardEvent);
    }
    super.addEventListener(type, listener as EventListener, options);
  }

  removeEventListener<K extends EventType<Events>>(
    type: K,
    listener: EventListenerFor<Events, K>,
    options?: boolean | EventListenerOptions
  ) {
    super.removeEventListener(type, listener as EventListener, options);
  }

  #forwardEvent = (event: Event) => {
    this.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
  };

  /**
   * Current stream type (`'on-demand'`, `'live'`, or `'unknown'`). Defaults to
   * `'unknown'`; detecting hosts update it automatically, and consumers can set
   * it to override detection.
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

  get volume() {
    return getMediaProp(this, 'volume') ?? 1;
  }
  set volume(value) {
    setMediaProp(this, 'volume', value);
  }

  get muted() {
    return getMediaProp(this, 'muted') ?? false;
  }
  set muted(value) {
    setMediaProp(this, 'muted', value);
  }

  get defaultMuted() {
    return getMediaProp(this, 'defaultMuted') ?? false;
  }
  set defaultMuted(value) {
    setMediaProp(this, 'defaultMuted', value);
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
