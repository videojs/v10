import type { EventListenerFor, EventType, QueriedElement } from '@videojs/utils/dom';
import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from '../../core/media/constants';
import {
  type EventLike,
  type MediaFull,
  type MediaStreamType,
  MediaStreamTypes,
  type MediaTargetLike,
  type TextTrackKind,
  type TextTrackLike,
} from '../../core/media/types';
import { getComponents, getOwner, getProp, setProp } from './utils';

export { addComponent, getComponents, getOwner, getProp, setProp } from './utils';

export interface HTMLMediaTargetLike extends MediaTargetLike, EventTarget {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
}

export interface Component<Target extends HTMLMediaTargetLike = HTMLMediaTargetLike> {
  readonly targetOverride?: Partial<Target> | null;
  setMedia?(host: HTMLMediaElementHost<Target, any>): void;
  attach?(target: Target): void;
  detach?(): void;
  destroy?(): void;
}

export interface ComponentConstructor<T extends Component = Component> {
  new (...args: any[]): T;
  readonly configKey?: string;
}

export interface Components extends Map<ComponentConstructor, Component> {
  get<T extends Component>(component: ComponentConstructor<T>): T | undefined;
  set<T extends Component>(component: ComponentConstructor<T>, instance: T): this;
}

// biome-ignore lint/suspicious/noEmptyInterface: augmentation target for component config namespaces
export interface MediaComponentConfig {}

/** Host config bag: free-form host/engine settings plus per-component config namespaces. */
export type MediaConfig = Partial<MediaComponentConfig> & Record<string, unknown>;

export class HTMLMediaElementHost<Target extends HTMLMediaTargetLike, Events extends { [K in keyof Events]: EventLike }>
  extends EventTarget
  implements MediaFull
{
  #target: Target | null = null;
  #eventTypes = new Set<string>();
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
  #config: MediaConfig = {};

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

  /**
   * Current stream type (`'on-demand'`, `'live'`, or `'unknown'`). Defaults to
   * `'unknown'`; detecting hosts update it automatically, and consumers can set
   * it to override detection.
   */
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

  get config(): MediaConfig {
    return this.#config;
  }
  set config(value: MediaConfig) {
    this.#config = value;

    for (const component of getComponents(this).values()) {
      const ctor = component.constructor as ComponentConstructor;
      const componentConfig = ctor.configKey && value[ctor.configKey];
      if (componentConfig) Object.assign(component, componentConfig);
    }
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

  play() {
    const owner = getOwner(this, 'play');
    return owner?.play?.() ?? Promise.reject(new DOMException('No media is attached.', 'NotSupportedError'));
  }

  pause() {
    const owner = getOwner(this, 'pause');
    owner?.pause?.();
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
    const owner = getOwner(this, 'load');
    return owner?.load?.();
  }

  canPlayType(type: string) {
    const owner = getOwner(this, 'canPlayType');
    return owner?.canPlayType?.(type) ?? '';
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
    const owner = getOwner(this, 'addTextTrack');
    return owner?.addTextTrack?.(kind, label, language) as TextTrackLike;
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
