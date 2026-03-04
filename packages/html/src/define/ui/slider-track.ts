import { SliderTrackElement } from '../../ui/slider/slider-track-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderTrackElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderTrackElement.tagName]: SliderTrackElement;
  }
}
