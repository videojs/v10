import type { AlertDialogState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { alertDialogContext } from './context';

/** Presentational backdrop that reflects its owning alert dialog's state. */
export class AlertDialogBackdropElement extends ContextPartElement<AlertDialogState> {
  static readonly tagName = 'media-alert-dialog-backdrop';

  protected readonly consumer = new ContextConsumer(this, { context: alertDialogContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');
  }
}
