import { HlsJsVideoElement } from '../../media/hlsjs-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsJsVideoElement);

export { HlsJsVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [HlsJsVideoElement.tagName]: HlsJsVideoElement;
  }
}
