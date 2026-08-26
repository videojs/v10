import { MuxAudioElement } from '../../../media/mux-audio/hls-js-element';
import { safeDefine } from '../../../registration/safe-define';

safeDefine(MuxAudioElement);

declare global {
  /** The Mux audio flavors in the build — see `../mux-video/spf` for why. */
  interface MuxAudioFlavors {
    'hls-js': MuxAudioElement;
  }

  interface HTMLElementTagNameMap {
    // Spelled out rather than `[MuxAudioElement.tagName]` — see `../mux-video/hls-js`.
    'mux-audio': MuxAudioFlavors[keyof MuxAudioFlavors];
  }
}
