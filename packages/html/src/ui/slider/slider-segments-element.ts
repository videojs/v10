import {
  getSliderSegmentsId,
  type SliderSegment,
  SliderSegmentDataAttrs,
  SliderSegmentsCore,
  SliderSegmentsCSSVars,
  SliderSegmentsDataAttrs,
} from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, getSliderTrackClipPath } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { sliderContext } from './context';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Renders ranges from the parent slider's value domain as an SVG clip path. */
export class SliderSegmentsElement extends MediaElement {
  static readonly tagName = 'media-slider-segments';

  readonly #core = new SliderSegmentsCore();
  readonly #context = new ContextConsumer(this, { context: sliderContext, subscribe: true });
  readonly #svg = document.createElementNS(SVG_NS, 'svg');
  readonly #clipPath = document.createElementNS(SVG_NS, 'clipPath');

  #segments: readonly SliderSegment[] = [];

  constructor() {
    super();

    this.#svg.setAttribute('width', '100%');
    this.#svg.setAttribute('height', '100%');
    this.#svg.setAttribute('aria-hidden', 'true');
    this.#clipPath.dataset.slot = 'slider-segments-clip-path';
    this.#svg.append(this.#clipPath);
    this.append(this.#svg);
  }

  get segments(): readonly SliderSegment[] {
    return this.#segments;
  }

  set segments(value: readonly SliderSegment[]) {
    if (value === this.#segments) return;
    this.#segments = value;
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#context.value?.setTrackClipPath(undefined);
    super.disconnectedCallback();
  }

  protected getSegments(): readonly SliderSegment[] {
    return this.#segments;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const context = this.#context.value;
    if (!context) return;

    this.#core.setProps({ segments: this.getSegments() });
    const state = this.#core.getState(
      context.state.orientation,
      context.min,
      context.max,
      context.state.pointing ? context.pointerValue : undefined
    );
    this.hidden = !state.hasSegments;
    context.setTrackClipPath(state.hasSegments ? getSliderTrackClipPath(context.id) : undefined);

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, SliderSegmentsDataAttrs);
    applyStateDataAttrs(this, context.state, context.stateAttrMap);

    const rects = Array.from(this.#clipPath.children) as SVGRectElement[];
    const nextRects = state.segments.map((segment) => {
      const size = `${segment.size}%`;
      const offset = `${segment.offset}%`;
      const index = rects.findIndex(
        (rect) =>
          rect.style.getPropertyValue(SliderSegmentsCSSVars.size) === size &&
          rect.style.getPropertyValue(SliderSegmentsCSSVars.offset) === offset
      );
      const rect = index >= 0 ? rects.splice(index, 1)[0]! : document.createElementNS(SVG_NS, 'rect');

      rect.dataset.slot = 'slider-segment';
      rect.style.setProperty(SliderSegmentsCSSVars.size, size);
      rect.style.setProperty(SliderSegmentsCSSVars.offset, offset);
      rect.toggleAttribute(SliderSegmentDataAttrs.highlighted, segment.highlighted);
      return rect;
    });
    this.#clipPath.replaceChildren(...nextRects);

    if (state.hasSegments) {
      this.#clipPath.id = getSliderSegmentsId(context.id);
    } else {
      this.#clipPath.removeAttribute('id');
    }
  }
}
