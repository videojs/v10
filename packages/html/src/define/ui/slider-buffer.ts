import { safeDefine } from '../../registration/safe-define';
import { SliderBufferElement } from '../../ui/slider/buffer';

safeDefine(SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
