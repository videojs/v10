import { SliderSegmentsElement } from '../../ui/slider/slider-segments-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderSegmentsElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderSegmentsElement.tagName]: SliderSegmentsElement;
  }
}
