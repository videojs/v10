import { safeDefine } from '../../registration/safe-define';
import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';

safeDefine(SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
