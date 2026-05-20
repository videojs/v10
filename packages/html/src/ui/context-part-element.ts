import type { StateAttrMap } from '@videojs/core';
import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { MediaElement } from './media-element';

/** Shape compound context values expose so part elements can render `data-*` attributes. */
export interface PartContextValue<State extends object> {
  /** Parent compound state propagated to descendant parts. */
  state: State;
  /** Maps state keys to `data-*` attribute names. */
  stateAttrMap: StateAttrMap<State>;
}

/**
 * Abstract base for compound-part elements that mirror a parent's state into `data-*` attributes.
 *
 * Subclasses only need to declare the `consumer` property:
 *
 * ```ts
 * export class SliderTrackElement extends ContextPartElement<SliderState> {
 *   static readonly tagName = 'media-slider-track';
 *   protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
 * }
 * ```
 */
export abstract class ContextPartElement<State extends object> extends MediaElement {
  protected abstract readonly consumer: { value?: PartContextValue<State> | undefined };

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    const ctx = this.consumer.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
