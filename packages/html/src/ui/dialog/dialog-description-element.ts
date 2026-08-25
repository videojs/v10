import type { DialogState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { dialogContext } from './context';

export class DialogDescriptionElement extends ContextPartElement<DialogState> {
  static readonly tagName: string = 'media-dialog-description';

  protected readonly consumer = new ContextConsumer(this, { context: dialogContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const descriptionId = this.consumer.value?.state.descriptionId;

    if (descriptionId) this.id = descriptionId;
  }
}
