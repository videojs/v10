import { TimeSliderChaptersCore } from '@videojs/core';
import { selectTextTrack, selectTime } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { playerContext } from '../../../player/context';
import { PlayerController } from '../../../player/player-controller';
import { sliderContext } from '../../slider/context';
import { UIElement } from '../../ui-element';

/** Displays the chapter title at the current pointer or keyboard position. */
export class TimeSliderChapterTitleElement extends UIElement {
  static readonly tagName = 'media-time-slider-chapter-title';

  readonly #core = new TimeSliderChaptersCore();
  readonly #slider = new ContextConsumer(this, { context: sliderContext, subscribe: true });
  readonly #textTrack = new PlayerController(this, playerContext, selectTextTrack);
  readonly #time = new PlayerController(this, playerContext, selectTime);

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const slider = this.#slider.value;
    if (!slider) return;

    const duration = this.#time.value?.duration ?? 0;
    const { chapters } = this.#core.getRanges(this.#textTrack.value?.chaptersCues ?? [], 0, duration);

    const keyboard = slider.state.interactive && !slider.state.pointing && !slider.state.dragging;
    const value = slider.state.pointing || slider.state.dragging ? slider.pointerValue : slider.state.value;
    const chapter = this.#core.findChapter(chapters, value);

    this.textContent = chapter?.cue?.text ?? '';

    if (keyboard) {
      this.removeAttribute('aria-hidden');
      this.setAttribute('aria-live', 'polite');
    } else {
      this.setAttribute('aria-hidden', 'true');
      this.removeAttribute('aria-live');
    }
  }
}
