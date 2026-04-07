import { findHotkeyCoordinator } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';

/** Provides `aria-keyshortcuts` for a given hotkey action name. */
export class HotkeyRegistryController implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement;
  #action: string;

  constructor(host: ReactiveControllerHost & HTMLElement, action: string) {
    this.#host = host;
    this.#action = action;
    host.addController(this);
  }

  get value(): string | undefined {
    const container = this.#host.closest('media-container');
    if (!container) return undefined;
    return findHotkeyCoordinator(container as HTMLElement)?.getAriaKeys(this.#action);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
