import { MuxAudio } from '../../../media/mux-audio/hlsjs-media';
import { safeDefine } from '../../safe-define';

export class MuxAudioElement extends MuxAudio {
  static readonly tagName = 'mux-audio';
}

safeDefine(MuxAudioElement);

declare global {
  /** The Mux audio flavors in the build — see `../mux-video/spf` for why. */
  interface MuxAudioFlavors {
    hlsjs: MuxAudioElement;
  }

  interface HTMLElementTagNameMap {
    [MuxAudioElement.tagName]: MuxAudioFlavors[keyof MuxAudioFlavors];
  }
}
