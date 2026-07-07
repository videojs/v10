import { VimeoVideo } from '../../media/vimeo-video';
import { safeDefine } from '../safe-define';

export class VimeoVideoElement extends VimeoVideo {
  static readonly tagName = 'vimeo-video';
}

safeDefine(VimeoVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [VimeoVideoElement.tagName]: VimeoVideoElement;
  }
}
