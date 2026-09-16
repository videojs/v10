import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

export class SliderBufferElement extends ContextPartElement<SliderState> {
  static readonly tagName = 'media-slider-buffer';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
