import { findHotkeyCoordinator } from '@videojs/core/dom';
import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { containerContext } from '../../player/context';

/** Provides `aria-keyshortcuts` for a given hotkey action name. */
export class HotkeyRegistryController implements ReactiveController {
  #action: string;
  #containerCtx: ContextConsumer<typeof containerContext, ReactiveControllerHost & HTMLElement>;

  constructor(host: ReactiveControllerHost & HTMLElement, action: string) {
    this.#action = action;
    this.#containerCtx = new ContextConsumer(host, { context: containerContext, subscribe: true });
    host.addController(this);
  }

  get value(): string | undefined {
    const container = this.#containerCtx.value?.container;
    if (!container) return undefined;
    return findHotkeyCoordinator(container as HTMLElement)?.getAriaKeys(this.#action);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}
}
