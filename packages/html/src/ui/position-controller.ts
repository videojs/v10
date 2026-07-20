import { isEventWithinElement } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

export type PositionControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Reactive controller that manages JS-fallback positioning for floating
 * popup elements (tooltips, popovers). Tracks scroll, resize, and
 * ResizeObserver events to keep the popup aligned with its trigger.
 *
 * Native CSS Anchor Positioning still uses this controller for dynamic
 * sizing variables such as available width/height.
 */
export class PositionController implements ReactiveController {
  readonly #host: PositionControllerHost;

  #abort: AbortController | null = null;
  #frame = 0;
  #resizeObserver: ResizeObserver | null = null;
  #trigger: HTMLElement | null = null;
  #boundary: Element | null = null;

  constructor(host: PositionControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  /** Discover a trigger element linked via `commandfor` attribute. */
  findTrigger(): HTMLElement | null {
    if (!this.#host.id) return null;
    const root = this.#host.getRootNode() as Document | ShadowRoot;
    return root.querySelector<HTMLElement>(`[commandfor="${this.#host.id}"]`);
  }

  /** Start or update position tracking for the given trigger. */
  sync(trigger: HTMLElement | null, boundary: Element | null = null): void {
    if (!trigger) return;
    if (this.#abort && this.#trigger === trigger && this.#boundary === boundary) return;

    this.cleanup();
    this.#abort = new AbortController();
    this.#trigger = trigger;
    this.#boundary = boundary;
    const { signal } = this.#abort;

    const reposition = (event?: Event) => {
      if (event && isEventWithinElement(event, this.#host)) return;

      cancelAnimationFrame(this.#frame);
      this.#frame = requestAnimationFrame(() => {
        if (signal.aborted) return;
        this.#host.requestUpdate();
      });
    };

    window.addEventListener('scroll', reposition, { capture: true, passive: true, signal });
    window.addEventListener('resize', reposition, { signal });

    if (typeof ResizeObserver === 'function') {
      this.#resizeObserver = new ResizeObserver(() => {
        reposition();
      });
      this.#resizeObserver.observe(trigger);
      this.#resizeObserver.observe(this.#host);
      if (boundary) this.#resizeObserver.observe(boundary);
    }

    reposition();
  }

  /** Stop all position tracking. */
  cleanup(): void {
    this.#abort?.abort();
    this.#abort = null;
    this.#trigger = null;
    this.#boundary = null;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    // Disconnect unobserves trigger, host, and boundary together.
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  hostDisconnected(): void {
    this.cleanup();
  }

  hostDestroyed(): void {
    this.cleanup();
  }
}
