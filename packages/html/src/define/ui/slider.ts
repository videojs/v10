import { safeDefine } from '../../registration/safe-define';
import { SliderElement } from '../../ui/slider/element';

safeDefine(SliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderElement.tagName]: SliderElement;
  }
}
