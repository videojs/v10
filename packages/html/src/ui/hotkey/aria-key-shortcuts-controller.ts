import { getHotkeyCoordinator, type HotkeyShortcutDetails } from '@videojs/core/dom';
import type { ReactiveController } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import type { ContainerContextConsumer } from '../../player/context';
import { containerContext } from '../../player/context';
import type { PlayerControllerHost } from '../../player/player-controller';

export interface AriaKeyShortcutsControllerOptions {
  value?: (() => number | undefined) | undefined;
}

/** Provides hotkey shortcut metadata for a given hotkey action name. */
export class AriaKeyShortcutsController implements ReactiveController {
  #host: PlayerControllerHost;
  #action: string;
  #getValue: (() => number | undefined) | undefined;
  #container: ContainerContextConsumer;
  #unsubscribe: (() => void) | null = null;

  constructor(host: PlayerControllerHost, action: string, options: AriaKeyShortcutsControllerOptions = {}) {
    this.#host = host;
    this.#action = action;
    this.#getValue = options.value;
    this.#container = new ContextConsumer(host, {
      context: containerContext,
      callback: () => this.#connect(),
      subscribe: true,
    });
    host.addController(this);
  }

  get value(): string | undefined {
    return this.aria;
  }

  get aria(): string | undefined {
    return this.details.aria;
  }

  get shortcut(): string | undefined {
    return this.details.shortcut;
  }

  get details(): HotkeyShortcutDetails {
    const container = this.#container.value?.container;
    if (!container) return {};
    return getHotkeyCoordinator(container).getShortcut(this.#action, this.#getValue?.());
  }

  hostConnected(): void {
    this.#connect();
  }

  hostDisconnected(): void {
    this.#disconnect();
  }

  #connect(): void {
    this.#disconnect();

    const container = this.#container.value?.container;
    if (!container) return;

    const coordinator = getHotkeyCoordinator(container);
    const notify = () => {
      this.#host.requestUpdate();
    };

    this.#unsubscribe = coordinator.subscribeShortcutChanges(notify);
    notify();
  }

  #disconnect(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
