import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { sliderContext } from './context';

/** Custom element shell for the `<media-slider-value>` tag — text display of a slider's current or pointer value. */
export class SliderValueElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-slider-value';

  static override properties = {
    type: { type: String },
  } satisfies PropertyDeclarationMap<'type'>;

  /** Which value to display — the committed `current` value or the live `pointer` position during hover/drag. */
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
