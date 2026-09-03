import { safeDefine } from '../../registration/safe-define';
import { SliderElement } from '../../ui/slider/slider-element';

safeDefine(SliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
  }
}
