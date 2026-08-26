import { VimeoVideoElement } from '../../media/vimeo-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(VimeoVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [VimeoVideoElement.tagName]: VimeoVideoElement;
  }
}
