import { safeDefine } from '../../registration/safe-define';
import { SliderValueElement } from '../../ui/slider/value';

safeDefine(SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
