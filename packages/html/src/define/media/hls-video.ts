import { HlsVideo } from '../../media/hls-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<hls-video>` tag — HLS playback via hls.js. */
export class HlsVideoElement extends HlsVideo {
  /** Custom element tag name. */
  static readonly tagName = 'hls-video';
}

safeDefine(HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
