import { SliderElement } from '../../ui/slider/slider-element';

export { SliderFillElement } from './slider-fill';
export { SliderThumbElement } from './slider-thumb';
export { SliderTrackElement } from './slider-track';
export { SliderValueElement } from './slider-value';

customElements.define(SliderElement.tagName, SliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
  }
}
