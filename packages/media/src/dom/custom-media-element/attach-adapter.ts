import type { PlaybackAdapter } from './custom-media-element';

/**
 * Solely owns an adapter's attachment lifecycle, keeping it attached to whichever value `target()` currently resolves
 * to and destroying it once the owning element has left the document for good. Callers must not attach or detach the
 * adapter independently while this owner is active.
 */
export class AdapterAttachment<Target extends EventTarget = EventTarget> {
  #element: HTMLElement;
  #adapter: PlaybackAdapter<Target>;
  #target: () => Target | null;
  #attachedTarget: Target | null = null;
  #onDestroy: (() => void) | undefined;

  /**
   * @param element - The custom element that owns the adapter.
   * @param adapter - The adapter to keep attached.
   * @param target - Resolves the concrete target to attach to; re-run on every `attach()`.
   * @param onDestroy - Runs after the adapter is destroyed, for anything else tied to the element's lifetime.
   */
  constructor(
    element: HTMLElement,
    adapter: PlaybackAdapter<Target>,
    target: () => Target | null,
    onDestroy?: () => void
  ) {
    this.#element = element;
    this.#adapter = adapter;
    this.#target = target;
    this.#onDestroy = onDestroy;
  }

  /**
   * Attach to the current target if it changed. Call after construction and whenever the target may have moved.
   *
   * @returns Whether the adapter moved to a different target.
   */
  attach(): boolean {
    const target = this.#target();
    if (target === this.#attachedTarget) return false;

    if (this.#attachedTarget) this.#adapter.detach();

    this.#attachedTarget = target;

    if (target) this.#adapter.attach(target);

    return true;
  }

  /**
   * Detach this lifecycle owner from the document. Call from `disconnectedCallback`. Destroys the adapter a microtask
   * later, so a synchronous move to a new parent keeps it; a `keep-alive` attribute on the owning element opts out
   * entirely.
   */
  detach(): void {
    if (this.#element.hasAttribute('keep-alive')) return;

    queueMicrotask(() => {
      if (this.#element.isConnected) return;

      this.#adapter.destroy();
      this.#attachedTarget = null;
      this.#onDestroy?.();
    });
  }
}
