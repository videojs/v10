import type { ControlsState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { controlsContext } from './context';

/** Interactive surface that reflects its owning controls state. */
export class ControlsContentElement extends ContextPartElement<ControlsState> {
  static readonly tagName = 'media-controls-content';

  protected readonly consumer = new ContextConsumer(this, { context: controlsContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('data-interactive', '');
  }
}
