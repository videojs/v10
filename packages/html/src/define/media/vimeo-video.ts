import { VimeoVideoElement } from '../../media/vimeo-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(VimeoVideoElement);

export { VimeoVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [VimeoVideoElement.tagName]: VimeoVideoElement;
  }
}
