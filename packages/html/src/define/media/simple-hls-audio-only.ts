import { SimpleHlsAudioOnly } from '../../media/simple-hls-audio-only';
import { safeDefine } from '../safe-define';

export class SimpleHlsAudioOnlyElement extends SimpleHlsAudioOnly {
  static readonly tagName = 'simple-hls-audio-only';
}

safeDefine(SimpleHlsAudioOnlyElement);

declare global {
  interface HTMLElementTagNameMap {
    [SimpleHlsAudioOnlyElement.tagName]: SimpleHlsAudioOnlyElement;
  }
}
