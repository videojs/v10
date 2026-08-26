import { safeDefine } from '../../registration/safe-define';
import { SliderThumbnailElement } from '../../ui/slider/slider-thumbnail-element';

safeDefine(SliderThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbnailElement.tagName]: SliderThumbnailElement;
  }
}
