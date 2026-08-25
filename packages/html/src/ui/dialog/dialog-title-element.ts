import type { DialogState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { dialogContext } from './context';

export class DialogTitleElement extends ContextPartElement<DialogState> {
  static readonly tagName: string = 'media-dialog-title';

  protected readonly consumer = new ContextConsumer(this, { context: dialogContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const titleId = this.consumer.value?.state.titleId;

    if (titleId) this.id = titleId;
  }
}
