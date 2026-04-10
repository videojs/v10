import { findHotkeyCoordinator } from '@videojs/core/dom';
import type { ReactiveController } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import type { ContainerContextConsumer } from '../../player/context';
import { containerContext } from '../../player/context';
import type { PlayerControllerHost } from '../../player/player-controller';

/** Provides `aria-keyshortcuts` for a given hotkey action name. */
export class AriaKeyShortcutsController implements ReactiveController {
  #action: string;
  #container: ContainerContextConsumer;

  constructor(host: PlayerControllerHost, action: string) {
    this.#action = action;
    this.#container = new ContextConsumer(host, { context: containerContext, subscribe: true });
    host.addController(this);
  }

  get value(): string | undefined {
    const container = this.#container.value?.container;
    if (!container) return undefined;
    return findHotkeyCoordinator(container)?.getAriaKeys(this.#action);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
