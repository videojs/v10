import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

export class SliderFillElement extends ContextPartElement<SliderState> {
  static readonly tagName = 'media-slider-fill';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
