import { safeDefine } from '../../registration/safe-define';
import { SliderThumbnailElement } from '../../ui/slider/thumbnail';

safeDefine(SliderThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbnailElement.tagName]: SliderThumbnailElement;
  }
}
