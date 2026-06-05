import {
  type CanPlayTypeResult,
  type ErrorLike,
  type EventLike,
  type MediaFull,
  type MediaPreloadType,
  type MediaStreamType,
  MediaStreamTypes,
  type RemotePlaybackLike,
  type TextTrackKind,
  type TextTrackLike,
} from '../../core/media/types';
import { EMPTY_REMOTE, EMPTY_TEXT_TRACKS, EMPTY_TIME_RANGES } from './constants';

export class HTMLMediaElementHost<T extends HTMLMediaElement, Events extends { [K in keyof Events]: EventLike }>
  extends EventTarget
  implements MediaFull
{
  #target: T | null = null;
  #types = new Set<string>();
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
  #config: Record<string, unknown> = {};

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
    this.#types.clear();
  }

  querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]> | never[];
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
  querySelectorAll(selectors: string): NodeListOf<Element> | never[] {
    return this.target?.querySelectorAll(selectors) ?? [];
  }

  querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelector(selectors: string): Element | null {
    return this.target?.querySelector(selectors) ?? null;
  }

  addEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.#types.has(type)) {
      this.#types.add(type);
      this.target?.addEventListener(type, this.#forwardEvent);
    }
    super.addEventListener(type, listener as EventListener, options);
  }

  removeEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | ((event: never) => void) | null,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options);
  }

  #forwardEvent = (event: Event) => {
    this.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
  };

  // -- Stream type --

  get streamType(): MediaStreamType {
    return this.#streamType;
  }

  set streamType(value: MediaStreamType) {
    if (this.#streamType === value) return;
    this.#streamType = value;
    this.dispatchEvent(new Event('streamtypechange'));
  }

  // -- Live --

  get liveEdgeStart() {
    return Number.NaN;
  }

  get targetLiveWindow() {
    return Number.NaN;
  }

  // -- Config --

  get config(): Record<string, unknown> {
    return this.#config;
  }

  set config(value: Record<string, unknown>) {
    this.#config = value;
  }

  // -- Metadata --

  get title() {
    return this.target?.title ?? '';
  }

  set title(value: string) {
    if (this.target) this.target.title = value;
  }

  // -- Controls --

  get controls() {
    return this.target?.controls ?? false;
  }

  set controls(value: boolean) {
    if (this.target) this.target.controls = value;
  }

  // -- Playback --

  get paused() {
    return this.target?.paused ?? true;
  }

  get ended() {
    return this.target?.ended ?? false;
  }

  get loop() {
    return this.target?.loop ?? false;
  }

  set loop(value: boolean) {
    if (this.target) this.target.loop = value;
  }

  play() {
    return this.target?.play() ?? Promise.reject();
  }

  pause() {
    this.target?.pause();
  }

  // -- Autoplay --

  get autoplay() {
    return this.target?.autoplay ?? false;
  }

  set autoplay(value: boolean) {
    if (this.target) this.target.autoplay = value;
  }

  // -- Time --

  get currentTime() {
    return this.target?.currentTime ?? 0;
  }

  set currentTime(value: number) {
    if (this.target) this.target.currentTime = value;
  }

  get duration() {
    return this.target?.duration ?? NaN;
  }

  get seeking() {
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
    return this.target?.readyState ?? 0;
  }

  get preload(): MediaPreloadType {
    return (this.target?.preload as MediaPreloadType) ?? 'metadata';
  }

  set preload(value: MediaPreloadType) {
    if (this.target) this.target.preload = value;
  }

  get crossOrigin() {
    return this.target?.crossOrigin ?? null;
  }

  set crossOrigin(value: string | null) {
    if (this.target) this.target.crossOrigin = value;
  }

  load() {
    this.target?.load();
  }

  canPlayType(type: string): CanPlayTypeResult {
    return this.target?.canPlayType(type) ?? '';
  }

  // -- Volume --

  get volume() {
    return this.target?.volume ?? 1;
  }

  set volume(value: number) {
    if (this.target) this.target.volume = value;
  }

  get muted() {
    return this.target?.muted ?? false;
  }

  set muted(value: boolean) {
    if (this.target) this.target.muted = value;
  }

  get defaultMuted() {
    return this.target?.defaultMuted ?? false;
  }

  set defaultMuted(value: boolean) {
    if (this.target) this.target.defaultMuted = value;
  }

  // -- Playback rate --

  get playbackRate() {
    return this.target?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
    if (this.target) this.target.playbackRate = value;
  }

  get defaultPlaybackRate() {
    return this.target?.defaultPlaybackRate ?? 1;
  }

  set defaultPlaybackRate(value: number) {
    if (this.target) this.target.defaultPlaybackRate = value;
  }

  // -- Buffer --

  get buffered(): TimeRanges {
    return this.target?.buffered ?? EMPTY_TIME_RANGES;
  }

  get seekable(): TimeRanges {
    return this.target?.seekable ?? EMPTY_TIME_RANGES;
  }

  // -- Played --

  get played(): TimeRanges {
    return this.target?.played ?? EMPTY_TIME_RANGES;
  }

  // -- Error --

  get error(): ErrorLike | null {
    return this.target?.error ?? null;
  }

  // -- Text tracks --

  get textTracks() {
    return (this.target?.textTracks as TextTrackList) ?? EMPTY_TEXT_TRACKS;
  }

  addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrackLike {
    return this.target?.addTextTrack(kind, label, language) as TextTrackLike;
  }

  // -- Remote playback --

  get remote(): RemotePlaybackLike {
    return this.target?.remote ?? EMPTY_REMOTE;
  }

  get disableRemotePlayback() {
    return this.target?.disableRemotePlayback ?? false;
  }

  set disableRemotePlayback(value: boolean) {
    if (this.target) this.target.disableRemotePlayback = value;
  }
}
