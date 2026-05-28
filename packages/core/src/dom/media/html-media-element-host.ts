import type { EventLike, MediaFull, MediaFullEvents } from '../../core/media/types';
import { HTMLMediaElementLayer } from './html-media-element-layer';

export class HTMLMediaElementHost<
  T extends HTMLMediaElement,
  Next extends MediaFull = MediaFull,
  Events extends { [K in keyof Events]: EventLike } = MediaFullEvents,
> extends HTMLMediaElementLayer<Next, Events> {
  override get target(): T | null {
    return super.target as T | null;
  }

  override set target(value: T | null) {
    super.target = value;
  }

  querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelector(selectors: string): Element | null {
    return this.target?.querySelector(selectors) ?? null;
  }

  querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]> | never[];
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
  querySelectorAll(selectors: string): NodeListOf<Element> | never[] {
    return this.target?.querySelectorAll(selectors) ?? [];
  }
}
