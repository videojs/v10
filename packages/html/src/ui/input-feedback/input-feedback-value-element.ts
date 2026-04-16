import { getInputFeedbackValueText, type InputFeedbackItemDataState } from '@videojs/core';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { inputFeedbackContext, inputFeedbackItemContext } from './context';

export class InputFeedbackValueElement extends ContextPartElement<InputFeedbackItemDataState> {
  static readonly tagName = 'media-input-feedback-value';

  protected readonly rootConsumer = new ContextConsumer(this, { context: inputFeedbackContext, subscribe: true });
  protected readonly consumer = new ContextConsumer(this, { context: inputFeedbackItemContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const root = this.rootConsumer.value;
    const ctx = this.consumer.value;
    if (!ctx || !root) return;

    this.textContent = getInputFeedbackValueText(ctx.state, root.currentValues);
  }
}
