import type { MediaContainer } from '@videojs/core/dom';
import { findHotkeyCoordinator } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext } from '../../player/context';

/** Provides `aria-keyshortcuts` for a given hotkey action name. */
export class HotkeyRegistryController implements ReactiveController {
  #action: string;
  #container: MediaContainer | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, action: string) {
    this.#action = action;
    host.addController(this);

    new ContextConsumer(host, {
      context: containerContext,
      callback: (value) => {
        this.#container = value?.container ?? null;
      },
      subscribe: true,
    });
  }

  get value(): string | undefined {
    if (!this.#container) return undefined;
    return findHotkeyCoordinator(this.#container as HTMLElement)?.getAriaKeys(this.#action);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
