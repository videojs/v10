import { safeDefine } from '../../registration/safe-define';
import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';

safeDefine(VolumeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
