import { HlsJsVideoElement } from '../../media/hlsjs-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsJsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsJsVideoElement.tagName]: HlsJsVideoElement;
  }
}
