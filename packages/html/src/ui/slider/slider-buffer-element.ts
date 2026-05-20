import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

/** Custom element shell for the `<media-slider-buffer>` tag — visualizes buffered ranges inside a slider track. */
export class SliderBufferElement extends ContextPartElement<SliderState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-slider-buffer';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
