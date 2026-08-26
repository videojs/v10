import { HlsBackgroundVideoElement } from '../../media/hls-background-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsBackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsBackgroundVideoElement.tagName]: HlsBackgroundVideoElement;
  }
}
