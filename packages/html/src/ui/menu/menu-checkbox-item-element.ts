import { applyElementProps, applyStateDataAttrs, completeMenuItemSelection } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuCheckboxItemElement extends MediaElement {
  static readonly tagName = 'media-menu-checkbox-item';

  static override properties = {
    checked: { type: Boolean },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'checked' | 'disabled'>;

  checked = false;
  disabled = false;

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #registered = false;
  #cleanupRegistration: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#registered = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#cleanupRegistration?.();
    this.#cleanupRegistration = null;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#registered = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (!this.#registered) {
      this.#registered = true;

      this.#cleanupRegistration = ctx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: () => {
            const currentCtx = this.#ctx.value;
            if (!currentCtx || this.disabled) return;

            this.checked = !this.checked;
            this.dispatchEvent(new CustomEvent('checked-change', { detail: { checked: this.checked }, bubbles: true }));
            completeMenuItemSelection(currentCtx.menu, currentCtx.parentMenu);
          },
          onPointerenter: () => {
            const currentCtx = this.#ctx.value;
            if (!this.disabled) currentCtx?.menu.highlight(this);
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    applyElementProps(this, {
      role: 'menuitemcheckbox',
      'aria-checked': String(this.checked),
      'aria-disabled': this.disabled ? 'true' : undefined,
    });

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
