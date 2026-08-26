import { YouTubeVideo } from '../../media/youtube-video';
import { safeDefine } from '../../registration/safe-define';

export class YouTubeVideoElement extends YouTubeVideo {
  static readonly tagName = 'youtube-video';
}

safeDefine(YouTubeVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [YouTubeVideoElement.tagName]: YouTubeVideoElement;
  }
}
