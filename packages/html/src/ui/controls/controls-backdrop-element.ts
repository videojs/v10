import type { ControlsState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { controlsContext } from './context';

/** Presentational backdrop that reflects its owning controls surface's state. */
export class ControlsBackdropElement extends ContextPartElement<ControlsState> {
  static readonly tagName = 'media-controls-backdrop';

  protected readonly consumer = new ContextConsumer(this, { context: controlsContext, subscribe: true });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'presentation');
    this.setAttribute('aria-hidden', 'true');
  }
}
