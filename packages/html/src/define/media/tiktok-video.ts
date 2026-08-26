import { TikTokVideoElement } from '../../media/tiktok-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(TikTokVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [TikTokVideoElement.tagName]: TikTokVideoElement;
  }
}
