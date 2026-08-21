import { ThumbnailElement } from '../../ui/thumbnail/thumbnail-element';
import { safeDefine } from '../safe-define';

safeDefine(ThumbnailElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-thumbnail': ThumbnailElement;
  }
}
