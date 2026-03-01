import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';

import './slider-buffer';
import './slider-fill';
import './slider-thumb';
import './slider-track';
import './slider-value';

customElements.define(TimeSliderElement.tagName, TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
  }
}
