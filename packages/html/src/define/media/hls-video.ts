import { HlsVideo } from '../../media/hls-video';
import { safeDefine } from '../safe-define';

export class HlsVideoElement extends HlsVideo {
  static readonly tagName = 'hls-video';
}

safeDefine(HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
