import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './slider-context';

export class SliderBufferElement extends ContextPartElement {
  static readonly tagName = 'media-slider-buffer';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
