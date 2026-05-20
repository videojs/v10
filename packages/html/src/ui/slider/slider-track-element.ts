import type { SliderState } from '@videojs/core';
import { ContextConsumer } from '@videojs/element/context';

import { ContextPartElement } from '../context-part-element';
import { sliderContext } from './context';

/** Custom element shell for the `<media-slider-track>` tag — visual rail of the slider that thumb and fill overlay. */
export class SliderTrackElement extends ContextPartElement<SliderState> {
  /** Custom element tag name. */
  static readonly tagName = 'media-slider-track';

  protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
}
