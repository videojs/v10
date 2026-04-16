import type { InputFeedbackItemDataState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { inputFeedbackItemContext } from './context';

export class InputFeedbackTimeElement extends ContextPartElement<InputFeedbackItemDataState> {
  static readonly tagName = 'media-input-feedback-time';

  protected readonly consumer = new ContextConsumer(this, { context: inputFeedbackItemContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const ctx = this.consumer.value;
    if (!ctx) return;

    this.textContent = ctx.state.value ?? '';
  }
}
