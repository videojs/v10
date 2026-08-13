import { MuxBackgroundVideo } from '../../media/mux-background-video';
import { safeDefine } from '../safe-define';

export class MuxBackgroundVideoElement extends MuxBackgroundVideo {
  static readonly tagName = 'mux-background-video';
}

safeDefine(MuxBackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxBackgroundVideoElement.tagName]: MuxBackgroundVideoElement;
  }
}
