import { SliderDataAttrs } from '@videojs/core';
import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { sliderContext } from './slider-context';

export class SliderFillElement extends MediaElement {
  static readonly tagName = 'media-slider-fill';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, SliderDataAttrs);
  }
}
