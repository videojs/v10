import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { ThumbnailElement } from '../thumbnail/element';
import { sliderContext } from './context';

/**
 * `<media-thumbnail>` whose `time` follows the slider pointer. Left empty, it draws an image of its own; supply an
 * `<img>` child to compose overlays or loading indicators beside the image it controls.
 */
// @ts-expect-error TS2417 — tagName narrows to a different literal for custom element registration.
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
