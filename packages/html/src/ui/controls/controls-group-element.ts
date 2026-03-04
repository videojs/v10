import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { controlsContext } from './controls-context';

export class ControlsGroupElement extends ContextPartElement {
  static readonly tagName = 'media-controls-group';

  protected readonly consumer = new ContextConsumer(this, { context: controlsContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
      this.setAttribute('role', 'group');
    }
  }
}
