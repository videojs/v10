import { safeDefine } from '../../registration/safe-define';
import { ThumbnailElement } from '../../ui/thumbnail/thumbnail-element';

safeDefine(ThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    [ThumbnailElement.tagName]: ThumbnailElement;
  }
}
