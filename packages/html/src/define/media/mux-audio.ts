import { MuxAudio } from '../../media/mux-audio';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<mux-audio>` tag — Mux-powered audio playback with built-in analytics. */
export class MuxAudioElement extends MuxAudio {
  /** Custom element tag name. */
  static readonly tagName = 'mux-audio';
}

safeDefine(MuxAudioElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxAudioElement.tagName]: MuxAudioElement;
  }
}
