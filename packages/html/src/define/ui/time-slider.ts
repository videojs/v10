import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';

export { SliderBufferElement } from './slider-buffer';
export { SliderFillElement } from './slider-fill';
export { SliderThumbElement } from './slider-thumb';
export { SliderTrackElement } from './slider-track';
export { SliderValueElement } from './slider-value';

customElements.define(TimeSliderElement.tagName, TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
  }
}
