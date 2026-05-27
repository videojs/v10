import { getExtensions } from './media-extension';
import type { EventLike, Media, MediaEvents } from './types';

/**
 * Abstract base for nodes in a media chain — a linked list of `EventTarget`s
 * that sits between the host (the player-facing media element) at the top and
 * the underlying playback target (e.g. `HTMLMediaElement`) at the bottom.
 *
 * Each layer holds a `next` pointer to the layer or terminal target beneath
 * it. Subclasses can override behavior on the way down (e.g. translate `src`,
 * intercept `play()`) and dispatch synthetic events on the way up. Layers are
 * pushed onto the chain with {@link addLayer} and popped via the destroy it
 * returns; {@link MediaExtension}s install layers as part of their lifecycle.
 *
 * Events flow in two directions:
 * - **Down → up:** every layer runs its own forwarder against the chain's
 *   `target`, so native events are delivered directly to each layer's
 *   subscribers without re-bubbling through the chain (no double-delivery).
 * - **Layer → up:** {@link dispatchEvent} on a layer bubbles to its `parent`,
 *   so extensions can fire synthetic events on themselves and have them
 *   reach the host.
 *
 * `target` is the resolved bottom of the chain. Assigning to it migrates the
 * forwarders of every layer to the new target and propagates down to the
 * tail; subclasses can override `set target` to react to attach/detach.
 *
 * {@link destroy} tears down installed extensions first, then any layers
 * still attached via `addLayer` (typically a delegate engine), then detaches
 * from the target.
 *
 * @example
 * class HlsLayer extends MediaLayer {
 *   override set target(target: HTMLMediaElement | null) {
 *     super.target = target;
 *     // attach hls.js, etc.
 *   }
 * }
 * const destroy = addLayer(media, new HlsLayer());
 *
 * @public
 */
export abstract class MediaLayer<
  Next extends Media = Media,
  Events extends { [K in keyof Events]: EventLike } = MediaEvents,
> extends EventTarget {
  // Direct neighbor below this layer in the chain — another `MediaLayer` or
  // the terminal native target. `target` walks down from here.
  #next: Next | null = null;

  // Direct neighbor above this layer — set by the `next` setter on whoever
  // sits above. Used by `dispatchEvent` to bubble synthetic events up.
  #parent: MediaLayer<any, any> | null = null;

  // Mirror of the chain's current target, kept per-layer so every layer can
  // independently track forwarder migration when `target` changes.
  #target: Media | null = null;

  // Event types this layer has been subscribed to. The first listener for
  // each type wires a forwarder onto `#target`; the set lets us replay those
  // wirings when `target` changes.
  #eventTypes = new Set<string>();

  /**
   * Top of this layer's chain — typically the host that owns it.
   *
   * Subclasses overriding for type narrowing should `return super.root` —
   * `this.next` would walk in the wrong direction (down instead of up).
   */
  get root(): MediaLayer<Next, Events> {
    let layer: MediaLayer<any, any> = this;
    while (layer.#parent) layer = layer.#parent;
    return layer as MediaLayer<Next, Events>;
  }

  /** Layer or terminal target directly beneath this one in the chain. */
  get next(): Next | null {
    return this.#next;
  }

  /**
   * Splice this layer's `next` slot. Wires the parent back-pointer on the new
   * neighbor (and clears it on the old) so {@link dispatchEvent} can bubble.
   * Used by {@link addLayer} during chain mutations; rarely set directly.
   */
  set next(next: Media | null) {
    const previous = this.#next;
    // The `=== this` guard avoids clobbering a back-pointer reassigned by an
    // interleaved swap (addLayer wires the new neighbor before clearing the old).
    if (previous instanceof MediaLayer && previous.#parent === this) previous.#parent = null;
    this.#next = next as Next | null;
    if (next instanceof MediaLayer) next.#parent = this;
  }

  /**
   * Bottom of this layer's chain — typically the underlying native media element.
   *
   * Subclasses overriding for type narrowing should `return super.target` —
   * `this.next` is only the immediate neighbor and may be another layer in
   * between, not the terminal target.
   */
  get target(): Media | null {
    let layer: MediaLayer<any, any> = this;
    while (layer.#next instanceof MediaLayer) layer = layer.#next;
    return layer.#next;
  }

  /**
   * Attach (or detach with `null`) the chain's playback target. Migrates this
   * layer's event forwarders from the previous target to the new one, then
   * propagates the change down the chain so every layer's forwarders also
   * migrate. Subclasses can override to react to attach/detach (e.g. wire up
   * an engine like hls.js).
   *
   * Subclass overrides should write `super.target = …`, **not**
   * `this.next.target = …` — `super` runs forwarder migration on this layer
   * before propagating downward; the latter skips migration (silently breaking
   * listeners on this layer) and is undefined when `next` is the terminal
   * target.
   */
  set target(target: Media | null) {
    const previous = this.#target;
    if (target === previous) return;
    this.#target = target;

    // Migrate this layer's forwarders — each layer in the chain owns its own
    // copy so listeners on the host don't duplicate-deliver via re-bubbling.
    if (previous) {
      const old = previous as unknown as EventTarget;
      for (const type of this.#eventTypes) old.removeEventListener(type, this.#forwardEvent);
    }
    if (target) {
      const next = target as unknown as EventTarget;
      for (const type of this.#eventTypes) next.addEventListener(type, this.#forwardEvent);
    }

    // Propagate downward. Two cases:
    //   1. `#next` is another layer — call its setter (recursive) so any
    //      subclass override along the chain runs.
    //   2. `#next` is the tail — store the new target directly in the slot.
    //      Skip when it already matches to avoid clearing a real target with
    //      itself (the `null → target` initial assign also lands here).
    if (this.#next instanceof MediaLayer) {
      this.#next.target = target;
    } else if (this.#next !== target) {
      this.#next = target as Next | null;
    }
  }

  /**
   * Delegate `play()` to `next`. Subclasses override to intercept (e.g. defer
   * until an engine is ready); rejects when nothing sits beneath this layer.
   */
  play() {
    return this.#next?.play() ?? Promise.reject();
  }

  /**
   * Tear down this layer: first destroys every installed extension (each pops
   * its own layer and runs its teardown), then detaches from the chain's
   * target, then recursively destroys any layers still attached via
   * {@link addLayer} (typically a delegate engine).
   */
  destroy() {
    // 1. Extensions first — each one's teardown may pop a layer it owns,
    //    which trims the chain before we recurse below.
    getExtensions(this as MediaLayer<any, any>).destroy();

    // 2. Snapshot `#next` before detach; `target = null` propagates through
    //    the setter and may rewrite the slot.
    const next = this.#next;
    this.target = null;

    // 3. Recurse — typically a delegate engine added via `addLayer` rather
    //    than via an extension.
    if (next instanceof MediaLayer) next.destroy();
  }

  /**
   * Subscribe to a media event. The first listener for a given `type` wires
   * a forwarder onto the chain's `target`, so listeners receive native events
   * directly without re-bubbling through the chain. Forwarders are migrated
   * automatically when `target` changes.
   */
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

  /**
   * Dispatch on this layer and bubble up the chain — the same event is
   * re-dispatched on every parent, so extensions can fire synthetic events
   * on themselves and have them reach the host.
   */
  override dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event);

    // Re-dispatch a *clone* on the parent — DOM events can only be in flight
    // once, so we can't reuse the same instance. Standard Event subclasses
    // accept their own instance as the init dictionary, which preserves
    // every standard property (detail, bubbles, cancelable, …).
    if (this.#parent) this.#parent.dispatchEvent(new (event.constructor as typeof Event)(event.type, event));

    return result;
  }

  // Forwarder wired by `addEventListener` / `set target`. Dispatches a clone
  // (see `dispatchEvent`) directly via `EventTarget.prototype.dispatchEvent`
  // — bypassing our override is intentional, otherwise this would bubble
  // through `#parent` and double-deliver since every parent runs its own
  // forwarder against the same target.
  #forwardEvent = (event: Event) => {
    EventTarget.prototype.dispatchEvent.call(this, new (event.constructor as typeof Event)(event.type, event));
  };
}

/**
 * Push a {@link MediaLayer} onto the top of a media chain. Returns an idempotent
 * destroy that pops the layer back out, restoring whatever sat beneath it.
 *
 * @example
 * const destroy = addLayer(media, new HlsLayer(media));
 * destroy();
 *
 * @public
 */
export function addLayer(media: MediaLayer<any, any>, layer: MediaLayer<any, any>): () => void {
  if (__DEV__ && layer.next != null) {
    throw new Error('[vjs] addLayer: layer is already added.');
  }

  // Splice `layer` between `media` and its current `next`. Order matters:
  // grab `media.next` *before* reassigning `media.next = layer`, otherwise
  // the setter would clear the parent back-pointer of the displaced
  // neighbor mid-swap.
  layer.next = media.next;
  media.next = layer;

  // Sync the new layer to the chain's current target so its `set target`
  // override runs. Skipped when nothing is attached — the override only
  // sees meaningful target changes.
  const current = media.target;
  if (current !== null) layer.target = current;

  return () => {
    // Find `layer` wherever it sits — it may have shifted under additional
    // pushes/pops since this destroy was created.
    let parent: MediaLayer<any, any> = media;
    while (parent.next !== layer) {
      // Hit the terminal (or null) before finding `layer` — already removed.
      if (!(parent.next instanceof MediaLayer)) return;
      parent = parent.next;
    }

    // Capture before we unlink — once detached, `layer.target` may resolve
    // to its own (now-stale) `#next` and miss the override invocation.
    const hadTarget = layer.target !== null;

    parent.next = layer.next;
    layer.next = null;

    // Trigger the removed layer's `set target` override with `null` so it
    // can run any attach/detach cleanup (engine teardown, etc.).
    if (hadTarget) layer.target = null;
  };
}
