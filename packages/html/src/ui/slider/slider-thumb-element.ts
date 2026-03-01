import { SliderDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { sliderContext } from './slider-context';

export class SliderThumbElement extends MediaElement {
  static readonly tagName = 'media-slider-thumb';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  #disconnect: AbortController | null = null;
  #thumbPropsApplied = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#thumbPropsApplied = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#thumbPropsApplied = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx) return;

    // Apply keyboard and focus handlers once — they don't change per slider instance.
    if (!this.#thumbPropsApplied && this.#disconnect) {
      applyElementProps(this, ctx.thumbProps, this.#disconnect.signal);
      this.#thumbPropsApplied = true;
    }

    // Apply ARIA attributes every update (values change as slider moves).
    applyElementProps(this, ctx.thumbAttrs);

    // Apply state data attributes.
    applyStateDataAttrs(this, ctx.state, SliderDataAttrs);
  }
}
