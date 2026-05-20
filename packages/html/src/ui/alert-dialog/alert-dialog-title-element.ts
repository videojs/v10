import type { AlertDialogState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { alertDialogContext } from './context';

/** Custom element shell for the `<media-alert-dialog-title>` tag — accessible title for the alert dialog. */
export class AlertDialogTitleElement extends ContextPartElement<AlertDialogState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-alert-dialog-title';

  protected readonly consumer = new ContextConsumer(this, { context: alertDialogContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const titleId = this.consumer.value?.state.titleId;
    if (titleId) this.id = titleId;
  }
}
