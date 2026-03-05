import { SliderFillElement } from '../../ui/slider/slider-fill-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderFillElement.tagName]: SliderFillElement;
  }
}
