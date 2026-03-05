import type { SliderPreviewOverflow } from '@videojs/core/dom';
import { applyStateDataAttrs, getSliderPreviewStyle } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { applyStyles } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { sliderContext } from './context';

export class SliderPreviewElement extends MediaElement {
  static readonly tagName = 'media-slider-preview';

  static override properties = {
    overflow: { type: String },
  } satisfies PropertyDeclarationMap<'overflow'>;

  overflow: SliderPreviewOverflow = 'clamp';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  #resizeObserver: ResizeObserver | null = null;
  #width = 0;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#resizeObserver = new ResizeObserver(([entry]) => {
      this.#width = entry!.contentRect.width;
      this.#applyPosition();
    });

    this.#resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  #applyPosition(): void {
    applyStyles(this, getSliderPreviewStyle(this.#width, this.overflow));
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);

    this.#applyPosition();
  }
}
