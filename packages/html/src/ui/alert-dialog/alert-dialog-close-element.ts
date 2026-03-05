import { applyElementProps, applyStateDataAttrs, createButton } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { alertDialogContext } from './context';

export class AlertDialogCloseElement extends MediaElement {
  static readonly tagName = 'media-alert-dialog-close';

  static override properties = {
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<'disabled'>;

  disabled = false;

  readonly #ctx = new ContextConsumer(this, { context: alertDialogContext, subscribe: true });

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
