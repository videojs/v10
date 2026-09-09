import { safeDefine } from '../../registration/safe-define';
import { SliderPreviewElement } from '../../ui/slider/preview';

safeDefine(SliderPreviewElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderPreviewElement.tagName]: SliderPreviewElement;
  }
}
