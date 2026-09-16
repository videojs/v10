import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

export class SliderTrackElement extends ContextPartElement<SliderState> {
  static readonly tagName = 'media-slider-track';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
