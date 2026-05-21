import { applyElementProps, type MenuApi } from '@videojs/core/dom';
import type { ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { type MenuContextValue, menuContext } from './context';

export interface SubmenuTriggerHost extends HTMLElement, ReactiveControllerHost {
  commandfor?: string | undefined;
}

export interface SubmenuTriggerControllerOptions {
  isDisabled: () => boolean;
}

export class SubmenuTriggerController {
  readonly #host: SubmenuTriggerHost;
  readonly #options: SubmenuTriggerControllerOptions;
  readonly #ctx: ContextConsumer<typeof menuContext, SubmenuTriggerHost>;

  #registeredMenu: MenuApi | null = null;
  #cleanupRegistration: (() => void) | null = null;

  constructor(host: SubmenuTriggerHost, options: SubmenuTriggerControllerOptions) {
    this.#host = host;
    this.#options = options;
    this.#ctx = new ContextConsumer(this.#host, { context: menuContext, subscribe: true });
  }

  get context(): MenuContextValue | null {
    return this.#ctx.value ?? null;
  }

  get hasSubmenu(): boolean {
    return Boolean(this.context && this.#host.commandfor);
  }

  connect(signal: AbortSignal): void {
    applyElementProps(
      this.#host,
      {
        onClick: this.#handleClick,
        onKeyDown: this.#handleKeyDown,
        onPointerenter: this.#handlePointerEnter,
      },
      { signal }
    );
  }

  getAttrs(): Record<string, string> | null {
    const menuCtx = this.context;
    const menuId = this.#host.commandfor;

    if (!menuCtx || !menuId) return null;

    const topEntry = menuCtx.navigation.stack[menuCtx.navigation.stack.length - 1];

    return {
      role: 'menuitem',
      'aria-haspopup': 'menu',
      'aria-expanded': topEntry?.menuId === menuId ? 'true' : 'false',
      'data-has-submenu': '',
    };
  }

  syncRegistration(active = this.hasSubmenu): void {
    const menuCtx = this.context;

    if (!active || !menuCtx) {
      this.cleanupRegistration();
      return;
    }

    if (this.#registeredMenu === menuCtx.menu) return;

    this.cleanupRegistration();
    this.#registeredMenu = menuCtx.menu;
    this.#cleanupRegistration = menuCtx.menu.registerItem(this.#host);
  }

  cleanupRegistration(): void {
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#registeredMenu = null;
  }

  #openSubmenu(): boolean {
    const menuCtx = this.context;
    const menuId = this.#host.commandfor;

    if (!menuCtx || !menuId || this.#options.isDisabled()) return false;

    menuCtx.menu.push(menuId, this.#host.id);
    return true;
  }

  #handleClick = (event: MouseEvent): void => {
    if (this.hasSubmenu) {
      if (event.button !== 0) return;

      this.#openSubmenu();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (!this.#options.isDisabled()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== event.currentTarget) return;

    if (this.#options.isDisabled()) {
      if (event.key !== 'Tab') event.preventDefault();
      return;
    }

    if (this.hasSubmenu) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#openSubmenu();
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#host.click();
    }
  };

  #handlePointerEnter = (): void => {
    const menuCtx = this.context;

    if (!menuCtx || !this.#host.commandfor || this.#options.isDisabled()) return;

    menuCtx.menu.highlight(this.#host, { focus: false });
  };
}
