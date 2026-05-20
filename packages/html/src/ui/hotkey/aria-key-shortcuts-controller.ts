import { findHotkeyCoordinator } from '@videojs/core/dom';
import type { ReactiveController } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import type { ContainerContextConsumer } from '../../player/context';
import { containerContext } from '../../player/context';
import type { PlayerControllerHost } from '../../player/player-controller';

/** Reactive controller that resolves an `aria-keyshortcuts` string for a registered hotkey action. */
export class AriaKeyShortcutsController implements ReactiveController {
  #action: string;
  #container: ContainerContextConsumer;

  /**
   * @param host - Host element that owns this controller.
   * @param action - Hotkey action name to look up.
   */
  constructor(host: PlayerControllerHost, action: string) {
    this.#action = action;
    this.#container = new ContextConsumer(host, { context: containerContext, subscribe: true });
    host.addController(this);
  }

  /** Resolved `aria-keyshortcuts` string for the action, or `undefined` when no matching hotkey is registered. */
  get value(): string | undefined {
    const container = this.#container.value?.container;
    if (!container) return undefined;
    return findHotkeyCoordinator(container)?.getAriaKeys(this.#action);
  }

  /** Reactive controller hook — no-op; resolution happens lazily via `value`. */
  hostConnected(): void {}
  /** Reactive controller hook — no-op. */
  hostDisconnected(): void {}
}
