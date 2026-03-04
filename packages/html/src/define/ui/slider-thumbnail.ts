import { SliderThumbnailElement } from '../../ui/slider/slider-thumbnail-element';
import { safeDefine } from '../safe-define';

safeDefine(SliderThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbnailElement.tagName]: SliderThumbnailElement;
  }
}
