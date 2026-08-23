import type { AlertDialogState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { alertDialogContext } from './context';

/** Visual popup that reflects its owning alert dialog's state. */
export class AlertDialogPopupElement extends ContextPartElement<AlertDialogState> {
  static readonly tagName = 'media-alert-dialog-popup';

  protected readonly consumer = new ContextConsumer(this, { context: alertDialogContext, subscribe: true });
}
