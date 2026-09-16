import { MuxAudioElement } from '../../../media/mux-audio/spf';
import { safeDefine } from '../../../registration/safe-define';

safeDefine(MuxAudioElement);

export { MuxAudioElement };

declare global {
  /** The Mux audio flavors in the build — see `../mux-video/spf` for why. */
  interface MuxAudioFlavors {
    spf: MuxAudioElement;
  }

  interface HTMLElementTagNameMap {
    'mux-audio': MuxAudioFlavors[keyof MuxAudioFlavors];
    // Only reachable once another flavor holds the primary tag, and only via the
    // override — so it types as `never` in a build where this is the lone flavor.
    'mux-audio-spf': Exclude<keyof MuxAudioFlavors, 'spf'> extends never ? never : MuxAudioElement;
  }
}
