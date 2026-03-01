import { SliderElement } from '../../ui/slider/slider-element';

import './slider-fill';
import './slider-thumb';
import './slider-track';
import './slider-value';

customElements.define(SliderElement.tagName, SliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
  }
}
