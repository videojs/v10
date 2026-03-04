import { SliderValueElement } from '../../ui/slider/slider-value-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
