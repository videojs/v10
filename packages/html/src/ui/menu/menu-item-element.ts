import { applyElementProps, completeMenuItemSelection } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { UIElement } from '../ui-element';
import { type MenuContextValue, menuContext } from './context';

export class MenuItemElement extends UIElement {
  static readonly tagName = 'media-menu-item';

  static override properties = {
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'disabled' | 'commandfor'>;

  disabled = false;
  /** ID of a nested `<media-menu-content>` page to open when activated. */
  commandfor: string | undefined = undefined;
  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #registeredMenu: MenuContextValue['menu'] | null = null;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#registeredMenu = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (this.#registeredMenu !== ctx.menu) {
      this.#cleanupRegistration?.();
      this.#registeredMenu = ctx.menu;
      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: (event: MouseEvent) => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.#isDisabled()) return;

            const target = this.commandfor;

            if (target) {
              this.#openSubmenu(target);
            } else {
              const select = new CustomEvent('select', { bubbles: true, cancelable: true });

              if (!this.dispatchEvent(select)) {
                event.preventDefault();
                return;
              }

              completeMenuItemSelection(currentCtx.menu);
            }

            event.preventDefault();
          },
          onKeyDown: (event: KeyboardEvent) => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.#isDisabled() || event.key !== 'ArrowRight') return;

            const target = this.commandfor;
            if (!target) return;

            this.#openSubmenu(target);
            event.preventDefault();
          },
          onPointerenter: () => {
            const currentCtx = this.#ctx.value;

            if (!this.#isDisabled()) currentCtx?.menu.highlight(this, { focus: false, pointer: true });
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    const hasSubmenu = Boolean(this.commandfor);

    applyElementProps(this, {
      role: 'menuitem',
      'aria-disabled': this.#isDisabled() ? 'true' : undefined,
      ...(hasSubmenu && {
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        'data-has-submenu': '',
      }),
    });
  }

  #openSubmenu(id: string): void {
    const root = this.getRootNode() as Document | ShadowRoot;
    const submenu = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`) as HTMLElement & {
      openMenu?: (reason?: 'click') => void;
    };

    submenu?.openMenu?.('click');
  }

  #isDisabled(): boolean {
    return this.disabled || this.getAttribute('aria-disabled') === 'true';
  }
}
