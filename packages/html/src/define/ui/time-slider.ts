import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';

import './slider';

customElements.define(TimeSliderElement.tagName, TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
  }
}
