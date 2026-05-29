import { getExtensions } from './media-extension';
import type { EventLike, Media, MediaEvents } from './types';

/**
 * Node in a media chain between the host and the playback target.
 * Layers can override downward calls and bubble synthetic events upward.
 *
 * @public
 */
export abstract class MediaLayer<
  Next extends Media = Media,
  Events extends { [K in keyof Events]: EventLike } = MediaEvents,
> extends EventTarget {
  #next: Next | null = null;
  #parent: MediaLayer<any, any> | null = null;
  #target: Media | null = null;
  #eventTypes = new Set<string>();

  /** Top of this layer's chain. */
  get root(): MediaLayer<Next, Events> {
    let layer: MediaLayer<any, any> = this;
    while (layer.#parent) layer = layer.#parent;
    return layer as MediaLayer<Next, Events>;
  }

  get next(): Next | null {
    return this.#next;
  }

  set next(next: Media | null) {
    const previous = this.#next;
    // Avoid clearing a back-pointer already reassigned during a splice.
    if (previous instanceof MediaLayer && previous.#parent === this) previous.#parent = null;
    this.#next = next as Next | null;
    if (next instanceof MediaLayer) next.#parent = this;
  }

  /** Bottom playback target of this layer's chain. */
  get target(): Media | null {
    let layer: MediaLayer<any, any> = this;
    while (layer.#next instanceof MediaLayer) layer = layer.#next;
    return layer.#next;
  }

  set target(target: Media | null) {
    const previous = this.#target;
    if (target === previous) return;
    this.#target = target;

    // Each layer owns its own forwarders.
    if (previous) {
      const old = previous as unknown as EventTarget;
      for (const type of this.#eventTypes) old.removeEventListener(type, this.#forwardEvent);
    }
    if (target) {
      const next = target as unknown as EventTarget;
      for (const type of this.#eventTypes) next.addEventListener(type, this.#forwardEvent);
    }

    // Propagate through layers; otherwise replace the terminal tail.
    if (this.#next instanceof MediaLayer) {
      this.#next.target = target;
    } else if (this.#next !== target) {
      this.#next = target as Next | null;
    }
  }

  play() {
    return this.#next?.play() ?? Promise.reject();
  }

  destroy() {
    // Extensions may pop layers before recursive destroy.
    getExtensions(this).forEach((extension) => extension.destroy());

    // Detach can rewrite `#next`.
    const next = this.#next;
    this.target = null;

    if (next instanceof MediaLayer) next.destroy();
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
  ) {
    if (!this.#eventTypes.has(type)) {
      this.#eventTypes.add(type);
      (this.#target as unknown as EventTarget | null)?.addEventListener(type, this.#forwardEvent);
    }
    super.addEventListener(type, listener as EventListener, options);
  }

  override dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event);

    // DOM events cannot be re-dispatched while in flight.
    if (this.#parent) this.#parent.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));

    return result;
  }

  // Bypass bubbling; every layer forwards from the same target.
  #forwardEvent = (event: Event) => {
    EventTarget.prototype.dispatchEvent.call(this, new (event.constructor as typeof Event)(event.type, event));
  };
}

/**
 * Push a layer onto a media chain.
 *
 * @public
 */
export function addLayer(media: MediaLayer<any, any>, layer: MediaLayer<any, any>): () => void {
  if (layer.next != null) {
    // Layer was already added, return a noop destroy.
    return () => {};
  }

  // Keep this order so parent back-pointers survive the splice.
  layer.next = media.next;
  media.next = layer;

  const current = media.target;
  if (current !== null) layer.target = current;

  return () => {
    let parent: MediaLayer<any, any> = media;
    while (parent.next !== layer) {
      if (!(parent.next instanceof MediaLayer)) return;
      parent = parent.next;
    }

    // Capture before unlinking so detached layers still see `null`.
    const hadTarget = layer.target !== null;

    parent.next = layer.next;
    layer.next = null;

    if (hadTarget) layer.target = null;
  };
}
