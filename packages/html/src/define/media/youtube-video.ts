import { YouTubeVideoElement } from '../../media/youtube-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(YouTubeVideoElement);

export { YouTubeVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [YouTubeVideoElement.tagName]: YouTubeVideoElement;
  }
}
