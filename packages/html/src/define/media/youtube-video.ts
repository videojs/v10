import { YouTubeVideo } from '../../media/youtube-video';
import { safeDefine } from '../safe-define';

export class YouTubeVideoElement extends YouTubeVideo {
  static readonly tagName = 'youtube-video';
}

safeDefine(YouTubeVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [YouTubeVideoElement.tagName]: YouTubeVideoElement;
  }
}
