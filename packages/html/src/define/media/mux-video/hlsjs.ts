import { MuxVideo } from '../../../media/mux-video/hlsjs-media';
import { safeDefine } from '../../safe-define';

export class MuxVideoElement extends MuxVideo {
  static readonly tagName = 'mux-video';
}

safeDefine(MuxVideoElement);

declare global {
  /** The Mux video flavors in the build — see `./spf` for why. */
  interface MuxVideoFlavors {
    hlsjs: MuxVideoElement;
  }

  interface HTMLElementTagNameMap {
    [MuxVideoElement.tagName]: MuxVideoFlavors[keyof MuxVideoFlavors];
  }
}
