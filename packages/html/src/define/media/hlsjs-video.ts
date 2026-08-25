import { HlsJsVideo } from '../../media/hlsjs-video';
import { safeDefine } from '../../registration/safe-define';

/** Cross-browser HLS media element powered by hls.js and registered as `<hlsjs-video>`. */
export class HlsJsVideoElement extends HlsJsVideo {
  static readonly tagName = 'hlsjs-video';
}

safeDefine(HlsJsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsJsVideoElement.tagName]: HlsJsVideoElement;
  }
}
