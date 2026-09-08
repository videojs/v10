import type { PlaybackAdapter } from './custom-media-element';

/**
 * Keeps an adapter attached to whichever element `target()` currently resolves to, and destroys it once the host has
 * left the document for good.
 */
export class AdapterAttachment {
  #host: HTMLElement;
  #adapter: PlaybackAdapter;
  #target: () => Element | null;
  #onDestroy: (() => void) | undefined;

  /**
   * @param host - The custom element that owns the adapter.
   * @param adapter - The adapter to keep attached.
   * @param target - Resolves the element to attach to; re-run on every `attach()`.
   * @param onDestroy - Runs after the adapter is destroyed, for whatever else the host tied to its lifetime.
   */
  constructor(host: HTMLElement, adapter: PlaybackAdapter, target: () => Element | null, onDestroy?: () => void) {
    this.#host = host;
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
    if (target === this.#adapter.target) return false;

    if (this.#adapter.target) this.#adapter.detach();

    this.#adapter.attach(target);

    return true;
  }

  /**
   * Call from `disconnectedCallback`. Destroys the adapter a microtask later, so a synchronous move to a new parent
   * keeps it; a `keep-alive` attribute on the host opts out entirely.
   */
  release(): void {
    if (this.#host.hasAttribute('keep-alive')) return;

    queueMicrotask(() => {
      if (this.#host.isConnected) return;

      this.#adapter.destroy();
      this.#onDestroy?.();
    });
  }
}
