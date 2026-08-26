import { HlsAudio } from '../../media/hls-audio';
import { safeDefine } from '../../registration/safe-define';

export class HlsAudioElement extends HlsAudio {
  static readonly tagName = 'hls-audio';
}

safeDefine(HlsAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsAudioElement.tagName]: HlsAudioElement;
  }
}
