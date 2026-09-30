import { HlsVideo } from '../../media/hls-video';
import { safeDefine } from '../../registration/safe-define';

export { isHlsVideoAdapter } from '@videojs/spf/hls-video';

/** Lightweight SPF-backed HLS media element registered as `<hls-video>`. */
export class HlsVideoElement extends HlsVideo {
  static readonly tagName = 'hls-video';
}

safeDefine(HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
