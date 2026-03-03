import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';

export { SliderFillElement } from './slider-fill';
export { SliderThumbElement } from './slider-thumb';
export { SliderTrackElement } from './slider-track';
export { SliderValueElement } from './slider-value';

customElements.define(VolumeSliderElement.tagName, VolumeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
