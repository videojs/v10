import { YouTubeVideoElement } from '../../media/youtube-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(YouTubeVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [YouTubeVideoElement.tagName]: YouTubeVideoElement;
  }
}
