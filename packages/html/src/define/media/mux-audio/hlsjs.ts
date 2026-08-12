import { MuxAudio } from '../../../media/mux-audio/hlsjs-media';
import { safeDefine } from '../../safe-define';

export class MuxAudioElement extends MuxAudio {
  static readonly tagName = 'mux-audio';
}

safeDefine(MuxAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxAudioElement.tagName]: MuxAudioElement;
  }
}
