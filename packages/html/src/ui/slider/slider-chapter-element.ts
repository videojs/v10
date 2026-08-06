import { SliderChapterCore } from '@videojs/core';
import { applyStateDataAttrs, createTextTrackSelector } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { sliderContext } from './context';

const selectChapters = createTextTrackSelector('chapters');

/** Displays the chapter at the slider pointer position. */
export class SliderChapterElement extends MediaElement {
  static readonly tagName = 'media-slider-chapter';

  readonly #core = new SliderChapterCore();
  readonly #chapters = new PlayerController(this, playerContext, selectChapters);
  readonly #slider = new ContextConsumer(this, { context: sliderContext, subscribe: true });

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const slider = this.#slider.value;
    if (!slider) return;

    const state = this.#core.getState(this.#chapters.value?.cues ?? [], slider.pointerValue);
    this.textContent = state.title;
    applyStateDataAttrs(this, slider.state, slider.stateAttrMap);
  }
}
