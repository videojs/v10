import { safeDefine } from '../../registration/safe-define';
import { SliderTrackElement } from '../../ui/slider/slider-track-element';

safeDefine(SliderTrackElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderTrackElement.tagName]: SliderTrackElement;
  }
}
