import { MuxVideo } from '../../media/mux-video';
import { safeDefine } from '../safe-define';

export class MuxVideoElement extends MuxVideo {
  static readonly tagName = 'mux-video';
}

safeDefine(MuxVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxVideoElement.tagName]: MuxVideoElement;
  }
}
