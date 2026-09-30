import { VimeoVideo } from '../../media/vimeo-video';
import { safeDefine } from '../../registration/safe-define';

export { isVimeoAdapter } from '@videojs/vimeo-video';

export class VimeoVideoElement extends VimeoVideo {
  static readonly tagName = 'vimeo-video';
}

safeDefine(VimeoVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [VimeoVideoElement.tagName]: VimeoVideoElement;
  }
}
