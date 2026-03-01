import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';

import './slider';

customElements.define(VolumeSliderElement.tagName, VolumeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
