import { HlsBackgroundVideoElement } from '../../media/hls-background-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsBackgroundVideoElement);

export { HlsBackgroundVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [HlsBackgroundVideoElement.tagName]: HlsBackgroundVideoElement;
  }
}
