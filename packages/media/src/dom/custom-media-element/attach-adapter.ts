import type { PlaybackAdapter } from './custom-media-element';

/**
 * Keeps an adapter attached to whichever element `target()` currently resolves to, and destroys it once the host has
 * left the document for good.
 */
export class AdapterAttachment {
  #host: HTMLElement;
  #adapter: PlaybackAdapter;
  #target: () => Element | null;

  /**
   * @param host - The custom element that owns the adapter.
   * @param adapter - The adapter to keep attached.
   * @param target - Resolves the element to attach to; re-run on every `attach()`.
   */
  constructor(host: HTMLElement, adapter: PlaybackAdapter, target: () => Element | null) {
    this.#host = host;
    this.#adapter = adapter;
    this.#target = target;
  }

  /** Attach to the current target if it changed. Call after construction and whenever the target may have moved. */
  attach(): void {
    const target = this.#target();
    if (target === this.#adapter.target) return;

    if (this.#adapter.target) this.#adapter.detach();

    this.#adapter.attach(target);
  }

  /**
   * Call from `disconnectedCallback`. Destroys the adapter a microtask later, so a synchronous move to a new parent
   * keeps it; a `keep-alive` attribute on the host opts out entirely.
   */
  release(): void {
    if (this.#host.hasAttribute('keep-alive')) return;

    queueMicrotask(() => {
      if (!this.#host.isConnected) this.#adapter.destroy();
    });
  }
}
