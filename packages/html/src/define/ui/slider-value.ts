import { safeDefine } from '../../registration/safe-define';
import { SliderValueElement } from '../../ui/slider/slider-value-element';

safeDefine(SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
