import {
  type EventLike,
  type MediaFull,
  type MediaStreamType,
  MediaStreamTypes,
  type TextTrackKind,
  type TextTrackLike,
} from '../../core/media/types';
import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from './constants';
import type { EventListenerFor, EventType, HTMLMediaTargetLike, QueriedElement } from './types';
import { getComponents, getProp, setProp } from './utils';

export type {
  AnyComponent,
  Component,
  ComponentConstructor,
  Components,
  HTMLMediaTargetLike,
} from './types';
export { addComponent, getComponents, getOwner, getProp, setProp } from './utils';

export class HTMLMediaElementHost<Target extends HTMLMediaTargetLike, Events extends { [K in keyof Events]: EventLike }>
  extends EventTarget
  implements MediaFull
{
  #target: Target | null = null;
  #eventTypes = new Set<string>();
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
  #config: Record<string, unknown> = {};

  protected get target() {
    return this.#target;
  }

  attach(target: Target) {
    if (!target || this.#target === target) return;
    this.#target = target;

    for (const type of this.#eventTypes) {
      target.addEventListener(type, this.#forwardEvent);
    }

    for (const component of getComponents(this).values()) {
      component.attach?.(target);
    }
  }

  detach() {
    if (!this.#target) return;

    for (const component of getComponents(this).values()) {
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

    const components = getComponents(this);
    for (const component of components.values()) {
      component.destroy?.();
    }
    components.clear();
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

  get streamType() {
    return getProp(this, 'streamType') ?? this.#streamType;
  }
  set streamType(value) {
    if (this.streamType === value) return;
    this.#streamType = value;
    setProp(this, 'streamType', value);
    this.dispatchEvent(new Event('streamtypechange'));
  }

  get liveEdgeStart() {
    return getProp(this, 'liveEdgeStart') ?? Number.NaN;
  }

  get targetLiveWindow() {
    return getProp(this, 'targetLiveWindow') ?? Number.NaN;
  }

  get config() {
    return getProp(this, 'config') ?? this.#config;
  }
  set config(value) {
    this.#config = value;
    setProp(this, 'config', value);
  }

  get title() {
    return getProp(this, 'title') ?? '';
  }
  set title(value) {
    setProp(this, 'title', value);
  }

  get controls() {
    return getProp(this, 'controls') ?? false;
  }
  set controls(value) {
    setProp(this, 'controls', value);
  }

  get paused() {
    return getProp(this, 'paused') ?? true;
  }

  get ended() {
    return getProp(this, 'ended') ?? false;
  }

  get loop() {
    return getProp(this, 'loop') ?? false;
  }
  set loop(value) {
    setProp(this, 'loop', value);
  }

  async play() {
    return getProp(this, 'play')?.();
  }

  pause() {
    getProp(this, 'pause')?.();
  }

  get autoplay() {
    return getProp(this, 'autoplay') ?? false;
  }
  set autoplay(value) {
    setProp(this, 'autoplay', value);
  }

  get currentTime() {
    return getProp(this, 'currentTime') ?? 0;
  }
  set currentTime(value) {
    setProp(this, 'currentTime', value);
  }

  get duration() {
    return getProp(this, 'duration') ?? NaN;
  }

  get seeking() {
    return getProp(this, 'seeking') ?? false;
  }

  get src() {
    return getProp(this, 'src') ?? '';
  }
  set src(value) {
    setProp(this, 'src', value);
  }

  get currentSrc() {
    return getProp(this, 'currentSrc') ?? '';
  }

  get readyState() {
    return getProp(this, 'readyState') ?? 0;
  }

  get preload() {
    return getProp(this, 'preload') ?? 'metadata';
  }
  set preload(value) {
    setProp(this, 'preload', value);
  }

  get crossOrigin() {
    return getProp(this, 'crossOrigin') ?? null;
  }
  set crossOrigin(value) {
    setProp(this, 'crossOrigin', value);
  }

  load() {
    return getProp(this, 'load')?.();
  }

  canPlayType(type: string) {
    return getProp(this, 'canPlayType')?.(type) ?? '';
  }

  get volume() {
    return getProp(this, 'volume') ?? 1;
  }
  set volume(value) {
    setProp(this, 'volume', value);
  }

  get muted() {
    return getProp(this, 'muted') ?? false;
  }
  set muted(value) {
    setProp(this, 'muted', value);
  }

  get defaultMuted() {
    return getProp(this, 'defaultMuted') ?? false;
  }
  set defaultMuted(value) {
    setProp(this, 'defaultMuted', value);
  }

  get playbackRate() {
    return getProp(this, 'playbackRate') ?? 1;
  }
  set playbackRate(value) {
    setProp(this, 'playbackRate', value);
  }

  get defaultPlaybackRate() {
    return getProp(this, 'defaultPlaybackRate') ?? 1;
  }
  set defaultPlaybackRate(value) {
    setProp(this, 'defaultPlaybackRate', value);
  }

  get buffered() {
    return (getProp(this, 'buffered') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get seekable() {
    return (getProp(this, 'seekable') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get played() {
    return (getProp(this, 'played') ?? EMPTY_TIME_RANGES) as TimeRanges;
  }

  get error() {
    return getProp(this, 'error') ?? null;
  }

  get textTracks() {
    return (getProp(this, 'textTracks') ?? EMPTY_TEXT_TRACKS) as TextTrackList;
  }

  addTextTrack(kind: TextTrackKind, label?: string, language?: string) {
    return getProp(this, 'addTextTrack')?.(kind, label, language) as TextTrackLike;
  }

  get remote() {
    return getProp(this, 'remote') ?? EMPTY_REMOTE;
  }

  get disableRemotePlayback() {
    return getProp(this, 'disableRemotePlayback') ?? false;
  }
  set disableRemotePlayback(value) {
    setProp(this, 'disableRemotePlayback', value);
  }
}
