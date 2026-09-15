import { HlsVideoElement } from '../../media/hls-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsVideoElement);

export { HlsVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [HlsVideoElement.tagName]: HlsVideoElement;
  }
}
