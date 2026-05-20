import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

/** Custom element shell for the `<media-slider-fill>` tag — visualizes the filled portion of the slider track. */
export class SliderFillElement extends ContextPartElement<SliderState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-slider-fill';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
