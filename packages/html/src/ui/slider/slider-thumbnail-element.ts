import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ThumbnailElement } from '../thumbnail/thumbnail-element';
import { sliderContext } from './context';

export class SliderThumbnailElement extends ThumbnailElement {
  static override readonly tagName = 'media-slider-thumbnail';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  protected override update(changed: PropertyValues): void {
    const ctx = this.#ctx.value;
    if (ctx) this.time = ctx.pointerValue;
    super.update(changed);
  }
}
