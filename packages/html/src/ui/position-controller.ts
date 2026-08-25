import { PopupPositioner, type PopupPositionerOptions } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

export type PositionControllerHost = ReactiveControllerHost & HTMLElement;

export type PositionControllerOptions = Omit<PopupPositionerOptions, 'popup'>;

let popupId = 0;

interface ImplicitTriggerBinding {
  id: string;
  trigger: HTMLElement;
}

/** Connects a popup element to the shared positioning lifecycle. */
export class PositionController implements ReactiveController {
  readonly #host: PositionControllerHost;
  readonly #positioner = new PopupPositioner();
  #implicitBinding: ImplicitTriggerBinding | null = null;

  constructor(host: PositionControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  /** Discover an explicit trigger by ID or one linked via `commandfor`. */
  findTrigger(trigger?: string): HTMLElement | null {
    const root = this.#host.getRootNode();

    if (root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      this.#releaseImplicitBinding();
      return null;
    }

    const scopedRoot = root as Document | DocumentFragment;

    if (trigger) {
      this.#releaseImplicitBinding();
      return scopedRoot.getElementById(trigger);
    }

    if (this.#implicitBinding) {
      const { id, trigger: boundTrigger } = this.#implicitBinding;

      if (
        this.#host.id === id &&
        boundTrigger.getAttribute('commandfor') === id &&
        this.#host.previousElementSibling === boundTrigger
      ) {
        return boundTrigger;
      }

      this.#releaseImplicitBinding();
    }

    if (this.#host.id) {
      return scopedRoot.querySelector<HTMLElement>(`[commandfor="${this.#host.id}"]`);
    }

    const adjacent = this.#host.previousElementSibling;

    if (!(adjacent instanceof HTMLElement)) {
      if (__DEV__) {
        console.warn(
          `[${this.#host.localName}] No trigger was found. Place the popup immediately after its trigger or link them explicitly.`
        );
      }

      return null;
    }

    const claimedTarget = adjacent.getAttribute('commandfor');

    if (claimedTarget) {
      if (__DEV__) {
        console.warn(
          `[${this.#host.localName}] The adjacent trigger already targets \`${claimedTarget}\`; link this popup explicitly.`
        );
      }

      return null;
    }

    const id = nextPopupId(scopedRoot);

    this.#host.id = id;
    adjacent.setAttribute('commandfor', id);
    this.#implicitBinding = { id, trigger: adjacent };
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
    this.#releaseImplicitBinding();
  }

  hostDestroyed(): void {
    this.cleanup();
    this.#releaseImplicitBinding();
  }

  #releaseImplicitBinding(): void {
    const binding = this.#implicitBinding;
    if (!binding) return;

    if (binding.trigger.getAttribute('commandfor') === binding.id) {
      binding.trigger.removeAttribute('commandfor');
    }

    if (this.#host.id === binding.id) {
      this.#host.removeAttribute('id');
    }

    this.#implicitBinding = null;
  }
}

function nextPopupId(root: Document | DocumentFragment): string {
  let id: string;

  do id = `vjs-popup-${++popupId}`;
  while (root.getElementById(id));

  return id;
}
