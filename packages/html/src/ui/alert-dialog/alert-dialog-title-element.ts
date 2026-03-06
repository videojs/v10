import type { AlertDialogState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { alertDialogContext } from './context';

export class AlertDialogTitleElement extends ContextPartElement<AlertDialogState> {
  static readonly tagName = 'media-alert-dialog-title';

  protected readonly consumer = new ContextConsumer(this, { context: alertDialogContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const titleId = this.consumer.value?.state.titleId;
    if (titleId) this.id = titleId;
  }
}
