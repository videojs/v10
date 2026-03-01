import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';

import './slider-fill';
import './slider-thumb';
import './slider-track';
import './slider-value';

customElements.define(VolumeSliderElement.tagName, VolumeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
