import { safeDefine } from '../../registration/safe-define';
import { SliderThumbElement } from '../../ui/slider/thumb';

safeDefine(SliderThumbElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbElement.tagName]: SliderThumbElement;
  }
}
