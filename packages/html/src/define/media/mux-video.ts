import { MuxVideo } from '../../media/mux-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<mux-video>` tag — Mux-powered video playback with built-in analytics. */
export class MuxVideoElement extends MuxVideo {
  /** Custom element tag name. */
  static readonly tagName = 'mux-video';
}

safeDefine(MuxVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxVideoElement.tagName]: MuxVideoElement;
  }
}
