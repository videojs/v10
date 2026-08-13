import {
  SliderSegmentsCore,
  TimeSliderChapterCSSVars,
  TimeSliderChapterDataAttrs,
  TimeSliderChaptersCore,
} from '@videojs/core';
import { applyStateDataAttrs, selectBuffer, selectTextTrack, selectTime } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { cloneTemplateRoot, getTemplateElement, getTemplateRoot } from '@videojs/utils/dom';

import { playerContext } from '../../../player/context';
import { PlayerController } from '../../../player/player-controller';
import { MediaElement } from '../../media-element';
import { sliderContext } from '../../slider/context';

/**
 * Clones a light-DOM template once per normalized chapter range.
 *
 * The template must contain exactly one HTML root element. Non-template children remain visible when the template is
 * missing or invalid, allowing consumers to provide a regular slider track as a fallback.
 */
export class TimeSliderChaptersElement extends MediaElement {
  static readonly tagName = 'media-time-slider-chapters';

  readonly #segments = new SliderSegmentsCore();
  readonly #core = new TimeSliderChaptersCore();
  readonly #slider = new ContextConsumer(this, { context: sliderContext, subscribe: true });
  readonly #textTrack = new PlayerController(this, playerContext, selectTextTrack);
  readonly #buffer = new PlayerController(this, playerContext, selectBuffer);
  readonly #time = new PlayerController(this, playerContext, selectTime);
  readonly #rendered = new Map<string, HTMLElement>();
  #templateRoot: HTMLElement | null = null;
  #templateChecked = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const slider = this.#slider.value;
    const duration = this.#time.value?.duration ?? 0;
    const templateRoot = this.#getTemplateRoot();
    if (!slider) return;

    applyStateDataAttrs(this, slider.state, slider.stateAttrMap);
    if (!templateRoot) return;

    const { chapters, ranges, max } = this.#core.getRanges(this.#textTrack.value?.chaptersCues ?? [], 0, duration);

    const geometry = this.#segments.getGeometry({
      ranges,
      min: 0,
      max,
      orientation: slider.state.orientation,
    });
    const buffered = this.#buffer.value?.buffered ?? [];
    const bufferedEnd = buffered.length ? buffered[buffered.length - 1]![1] : 0;
    const next = new Map<string, HTMLElement>();

    for (const segment of geometry) {
      const state = this.#core.getState(
        this.#segments.getState(segment, slider.state, slider.pointerValue),
        chapters,
        bufferedEnd
      );
      let root = this.#rendered.get(state.key);

      if (!root) root = cloneTemplateRoot(templateRoot, this.ownerDocument);

      this.#setStyle(root, 'pointer-events', state.cue ? undefined : 'none');
      this.#setStyle(root, TimeSliderChapterCSSVars.start, state.startPercent);
      this.#setStyle(root, TimeSliderChapterCSSVars.end, state.endPercent);
      this.#setStyle(root, TimeSliderChapterCSSVars.width, state.width ?? state.height);
      this.#setStyle(root, TimeSliderChapterCSSVars.fill, `${state.fillPercent}%`);
      this.#setStyle(root, TimeSliderChapterCSSVars.buffer, `${state.bufferPercent}%`);
      applyStateDataAttrs(root, slider.state, slider.stateAttrMap);
      applyStateDataAttrs(root, state, TimeSliderChapterDataAttrs);

      next.set(state.key, root);
    }

    for (const [key, root] of this.#rendered) {
      if (!next.has(key)) root.remove();
    }

    let before: ChildNode | null = null;
    for (const root of [...next.values()].reverse()) {
      if (root.parentNode !== this || root.nextSibling !== before) this.insertBefore(root, before);
      before = root;
    }

    this.#rendered.clear();
    for (const [key, rendered] of next) this.#rendered.set(key, rendered);
  }

  #getTemplateRoot(): HTMLElement | null {
    if (this.#templateChecked) return this.#templateRoot;

    const template = getTemplateElement(this);
    if (!template) return null;

    this.#templateChecked = true;
    const root = getTemplateRoot(template);
    if (root?.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
      if (__DEV__) {
        console.warn(`[${this.localName}] template must contain exactly one HTML root element.`);
      }
      return null;
    }

    this.#templateRoot = root as HTMLElement;
    for (const node of [...this.childNodes]) {
      if (node !== template) node.remove();
    }

    return this.#templateRoot;
  }

  #setStyle(element: HTMLElement, name: string, value: string | undefined): void {
    if (value === undefined) element.style.removeProperty(name);
    else element.style.setProperty(name, value);
  }
}
