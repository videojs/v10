import { applyElementProps, applyStateDataAttrs, createButton } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { UIElement } from '../ui-element';
import { dialogContext } from './context';

export class DialogCloseElement extends UIElement {
  static readonly tagName: string = 'media-dialog-close';

  static override properties = {
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'disabled'>;

  disabled = false;

  readonly #ctx = new ContextConsumer(this, { context: dialogContext, subscribe: true });
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.#ctx.value?.close(),
      isDisabled: () => this.disabled,
    });

    applyElementProps(this, buttonProps, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    const ctx = this.#ctx.value;

    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
