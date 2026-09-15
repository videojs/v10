import { TikTokVideoElement } from '../../media/tiktok-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(TikTokVideoElement);

export { TikTokVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [TikTokVideoElement.tagName]: TikTokVideoElement;
  }
}
