import { MoqVideo } from '../../media/moq-video';
import { safeDefine } from '../safe-define';

export class MoqVideoElement extends MoqVideo {
  static readonly tagName = 'moq-video';
}

safeDefine(MoqVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [MoqVideoElement.tagName]: MoqVideoElement;
  }
}
