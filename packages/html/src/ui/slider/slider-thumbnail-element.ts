import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ThumbnailElement } from '../thumbnail/thumbnail-element';
import { sliderContext } from './context';

/** Custom element shell for the `<media-slider-thumbnail>` tag — thumbnail sprite for the slider's hover/scrub position. */
// @ts-expect-error TS2417 — tagName narrows to a different literal for custom element registration.
export class SliderThumbnailElement extends ThumbnailElement {
  /** Custom element tag name. */
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
