import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { sliderContext } from './context';

export class SliderValueElement extends MediaElement {
  static readonly tagName = 'media-slider-value';

  static override properties = {
    type: { type: String },
  } satisfies PropertyDeclarationMap<'type'>;

  type: 'current' | 'pointer' = 'current';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-live', 'off');
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx) return;

    const value = this.type === 'pointer' ? ctx.pointerValue : ctx.state.value;

    this.textContent = ctx.formatValue ? ctx.formatValue(value, this.type) : String(Math.round(value));

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
