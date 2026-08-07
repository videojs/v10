import { createTextTrackSelector } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { SliderSegmentsElement } from '../slider/slider-segments-element';

const selectChapters = createTextTrackSelector('chapters');

/** Renders chapter cues from the player store as slider segments. */
// @ts-expect-error TS2417 — tagName narrows to a different literal for custom element registration.
export class TimeSliderSegmentsElement extends SliderSegmentsElement {
  static override readonly tagName = 'media-time-slider-segments';

  readonly #chapters = new PlayerController(this, playerContext, selectChapters);

  protected override getSegments() {
    return this.#chapters.value?.cues.map(({ startTime, endTime }) => ({ start: startTime, end: endTime })) ?? [];
  }
}
