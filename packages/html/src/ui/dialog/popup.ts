import type { DialogState } from '@videojs/core';
import { applyElementProps, type DialogApi } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { dialogContext } from './context';

/** Semantic popup that owns focus management and dialog transition completion. */
export class DialogPopupElement extends ContextPartElement<DialogState> {
  static readonly tagName = 'media-dialog-popup';

  protected readonly consumer = new ContextConsumer(this, { context: dialogContext, subscribe: true });

  #dialog: DialogApi | null = null;

  override disconnectedCallback(): void {
    this.#dialog?.setPopupElement(null);
    this.#dialog = null;
    super.disconnectedCallback();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const ctx = this.consumer.value;
    if (!ctx) return;

    if (this.#dialog !== ctx.dialog) {
      this.#dialog?.setPopupElement(null);
      this.#dialog = ctx.dialog;
      this.#dialog.setPopupElement(this);
    }

    applyElementProps(this, {
      id: ctx.popupId,
      tabIndex: -1,
      ...ctx.popupAttrs,
    });
  }
}
