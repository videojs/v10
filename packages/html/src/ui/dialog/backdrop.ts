import type { DialogState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { dialogContext } from './context';

/** Presentational backdrop that reflects its owning dialog's state. */
export class DialogBackdropElement extends ContextPartElement<DialogState> {
  static readonly tagName = 'media-dialog-backdrop';

  protected readonly consumer = new ContextConsumer(this, { context: dialogContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');
  }
}
