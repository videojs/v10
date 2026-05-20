import type { ControlsState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { controlsContext } from './context';

/** Custom element shell for the `<media-controls-group>` tag — labeled grouping inside `<media-controls>` for assistive tech. */
export class ControlsGroupElement extends ContextPartElement<ControlsState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-controls-group';

  protected readonly consumer = new ContextConsumer(this, { context: controlsContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
      this.setAttribute('role', 'group');
    }
  }
}
