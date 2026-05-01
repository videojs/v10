import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext, menuRadioGroupContext } from './context';

export class MenuRadioItemElement extends MediaElement {
  static readonly tagName = 'media-menu-radio-item';

  static override properties = {
    value: { type: String },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'value' | 'disabled'>;

  value = '';
  disabled = false;

  readonly #menuCtx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #groupCtx = new ContextConsumer(this, { context: menuRadioGroupContext, subscribe: true });

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

    const menuCtx = this.#menuCtx.value;
    const groupCtx = this.#groupCtx.value;
    if (!menuCtx || !groupCtx || !this.#disconnect) return;

    if (!this.#registered) {
      this.#registered = true;

      this.#cleanupRegistration = menuCtx.menu.registerItem(this);

      applyElementProps(
        this,
        {
          onClick: () => {
            if (this.disabled) return;
            groupCtx.onValueChange(this.value);
            menuCtx.menu.close();
          },
          onPointerenter: () => {
            if (!this.disabled) menuCtx.menu.highlight(this);
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    const checked = groupCtx.value === this.value;

    applyElementProps(this, {
      role: 'menuitemradio',
      'aria-checked': String(checked),
      'aria-disabled': this.disabled ? 'true' : undefined,
    });

    applyStateDataAttrs(this, menuCtx.state, menuCtx.stateAttrMap);
  }
}
