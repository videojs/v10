import { HlsAudioElement } from '../../media/hls-audio';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsAudioElement);

export { HlsAudioElement };

declare global {
  interface HTMLElementTagNameMap {
    [HlsAudioElement.tagName]: HlsAudioElement;
  }
}
