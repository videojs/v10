import type { StateAttrMap } from '@videojs/core';
import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { MediaElement } from './media-element';

/** Shape that compound context values must satisfy for parts to consume. */
export interface PartContextValue<State extends object> {
  state: State;
  stateAttrMap: StateAttrMap<State>;
}

/**
 * Abstract base for compound-component part elements that consume a parent
 * context and apply data attributes from `ctx.state` + `ctx.stateAttrMap`.
 *
 * Subclasses only need to declare the `consumer` property:
 *
 * ```ts
 * export class SliderTrackElement extends ContextPartElement {
 *   static readonly tagName = 'media-slider-track';
 *   protected readonly consumer = new ContextConsumer(this, { context: sliderContext, subscribe: true });
 * }
 * ```
 */
export abstract class ContextPartElement<State extends object = object> extends MediaElement {
  protected abstract readonly consumer: { value?: PartContextValue<State> | undefined };

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    const ctx = this.consumer.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
