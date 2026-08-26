import { HlsAudioElement } from '../../media/hls-audio/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(HlsAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsAudioElement.tagName]: HlsAudioElement;
  }
}
