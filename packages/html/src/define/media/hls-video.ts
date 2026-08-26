import { HlsVideoElement } from '../../media/hls-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
