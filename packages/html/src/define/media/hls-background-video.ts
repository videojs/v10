import { HlsBackgroundVideo } from '../../media/hls-background-video';
import { safeDefine } from '../../registration/safe-define';

export { isHlsBackgroundVideoMedia } from '@videojs/spf/hls-background-video';

export class HlsBackgroundVideoElement extends HlsBackgroundVideo {
  static readonly tagName = 'hls-background-video';
}

safeDefine(HlsBackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsBackgroundVideoElement.tagName]: HlsBackgroundVideoElement;
  }
}
