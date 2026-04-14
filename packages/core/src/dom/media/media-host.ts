import type { ErrorLike, EventLike, EventTargetLike } from '../../core/media/types';

const EMPTY_TIME_RANGES: Readonly<TimeRanges> = Object.freeze({
  length: 0,
  start() {
    return 0;
  },
  end() {
    return 0;
  },
} as TimeRanges);

export class HTMLMediaElementHost<T extends HTMLMediaElement, Events extends { [K in keyof Events]: EventLike }>
  extends EventTarget
  implements EventTargetLike<Events>
{
  #target: T | null = null;
  #types = new Set<string>();

  get target() {
    return this.#target;
  }

  // -- Playback --

  get paused() {
    return this.target?.paused ?? true;
  }

  get ended() {
    return this.target?.ended ?? false;
  }

  play() {
    return this.target?.play() ?? Promise.reject();
  }

  pause() {
    this.target?.pause();
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

  load() {
    this.target?.load();
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

  // -- Playback rate --

  get playbackRate() {
    return this.target?.playbackRate ?? 1;
  }

  set playbackRate(value: number) {
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

  querySelectorAll(selectors: string) {
    return this.target?.querySelectorAll(selectors) ?? [];
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
}
