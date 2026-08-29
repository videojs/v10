import { safeDefine } from '../../registration/safe-define';
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';

safeDefine(SliderPreviewElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderPreviewElement.tagName]: SliderPreviewElement;
  }
}
