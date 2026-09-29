import { HlsAudio } from '../../media/hls-audio';
import { safeDefine } from '../../registration/safe-define';

export { isHlsAudioMedia } from '@videojs/spf/hls-audio';

export class HlsAudioElement extends HlsAudio {
  static readonly tagName = 'hls-audio';
}

safeDefine(HlsAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsAudioElement.tagName]: HlsAudioElement;
  }
}
