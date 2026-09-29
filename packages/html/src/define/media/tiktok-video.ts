import { TikTokVideo } from '../../media/tiktok-video';
import { safeDefine } from '../../registration/safe-define';

export { isTikTokMedia } from '@videojs/tiktok-video';

export class TikTokVideoElement extends TikTokVideo {
  static readonly tagName = 'tiktok-video';
}

safeDefine(TikTokVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [TikTokVideoElement.tagName]: TikTokVideoElement;
  }
}
