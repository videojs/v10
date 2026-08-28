import type { QueriedElement } from '@videojs/utils/dom';

import type { MediaTargetLike } from '../../core/types';
import { getMediaComponents } from '../utils';

export interface HTMLMediaTargetLike extends MediaTargetLike, EventTarget {
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> | never[];
}

/**
 * Everything a media host does that is not a media capability: own a target, mirror its events, and hold the media
 * components registered against it.
 *
 * Capabilities are composed on top through the mixins in `./capabilities`, so a host exposes only the properties its
 * media can actually honor. `HTMLMediaElementHost` is the full `HTMLMediaElement`-shaped composition; a media with a
 * narrower surface (an animated image, say) composes its own.
 */
export class MediaHostBase extends EventTarget {
  #target: HTMLMediaTargetLike | null = null;
  #eventTypes = new Set<string>();

  protected get target(): HTMLMediaTargetLike | null {
    return this.#target;
  }

  attach(target: HTMLMediaTargetLike): void {
    if (!target || this.#target === target) return;

    this.#target = target;

    for (const type of this.#eventTypes) {
      target.addEventListener(type, this.#forwardEvent);
    }

    for (const component of getMediaComponents(this).values()) {
      component.attach?.(target);
    }
  }

  detach(): void {
    if (!this.#target) return;

    for (const component of getMediaComponents(this).values()) {
      component.detach?.();
    }

    for (const type of this.#eventTypes) {
      this.#target.removeEventListener(type, this.#forwardEvent);
    }

    this.#target = null;
  }

  destroy(): void {
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

  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.#eventTypes.has(type)) {
      this.#eventTypes.add(type);
      this.target?.addEventListener(type, this.#forwardEvent);
    }

    super.addEventListener(type, listener, options);
  }

  #forwardEvent = (event: Event) => {
    this.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));
  };
}
