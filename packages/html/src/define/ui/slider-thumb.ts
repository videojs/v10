import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderThumbElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbElement.tagName]: SliderThumbElement;
  }
}
