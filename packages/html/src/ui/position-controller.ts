import { PopupPositioner, type PopupPositionerOptions } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

export type PositionControllerHost = ReactiveControllerHost & HTMLElement;

export type PositionControllerOptions = Omit<PopupPositionerOptions, 'popup'>;

/** Connects a popup element to the shared positioning lifecycle. */
export class PositionController implements ReactiveController {
  readonly #host: PositionControllerHost;
  readonly #positioner = new PopupPositioner();

  constructor(host: PositionControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  /** Discover an explicit trigger by ID or one linked via `commandfor`. */
  findTrigger(trigger?: string): HTMLElement | null {
    const root = this.#host.getRootNode() as Document | ShadowRoot;
    if (trigger) {
      return root.getElementById(trigger);
    }
    if (!this.#host.id) return null;
    return root.querySelector<HTMLElement>(`[commandfor="${this.#host.id}"]`);
  }

  sync(options: PositionControllerOptions): void {
    this.#positioner.sync({ ...options, popup: this.#host });
  }

  cleanup(): void {
    this.#positioner.cleanup();
  }

  hostDisconnected(): void {
    this.cleanup();
  }

  hostDestroyed(): void {
    this.cleanup();
  }
}
