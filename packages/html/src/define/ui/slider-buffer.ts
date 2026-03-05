import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
