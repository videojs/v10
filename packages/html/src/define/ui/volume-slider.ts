import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { SliderValueElement } from '../../ui/slider/slider-value-element';
import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';
import { safeDefine } from '../safe-define';

// Parent slider first — sub-elements consume its context.
safeDefine(VolumeSliderElement);
safeDefine(SliderFillElement);
safeDefine(SliderPreviewElement);
safeDefine(SliderThumbElement);
safeDefine(SliderTrackElement);
safeDefine(SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
