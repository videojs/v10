import { safeDefine } from '../../registration/safe-define';
import { SliderFillElement } from '../../ui/slider/slider-fill-element';

safeDefine(SliderFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderFillElement.tagName]: SliderFillElement;
  }
}
