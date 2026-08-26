import { safeDefine } from '../../registration/safe-define';
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';

safeDefine(SliderThumbElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbElement.tagName]: SliderThumbElement;
  }
}
