import { PopupPositioner, type PopupPositionerOptions } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

export type PositionControllerHost = ReactiveControllerHost & HTMLElement;

export type PositionControllerOptions = Omit<PopupPositionerOptions, 'popup'>;

let popupId = 0;

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
    if (this.#host.id) {
      return root.querySelector<HTMLElement>(`[commandfor="${this.#host.id}"]`);
    }

    const adjacent = this.#host.previousElementSibling;
    if (!(adjacent instanceof HTMLElement)) return null;

    this.#host.id = nextPopupId(root);
    adjacent.setAttribute('commandfor', this.#host.id);
    return adjacent;
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

function nextPopupId(root: Document | ShadowRoot): string {
  let id: string;
  do id = `vjs-popup-${++popupId}`;
  while (root.getElementById(id));
  return id;
}
