import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './slider-context';

export class SliderTrackElement extends ContextPartElement {
  static readonly tagName = 'media-slider-track';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
