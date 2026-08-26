import { ShakaVideo } from '../../media/shaka-video';
import { safeDefine } from '../../registration/safe-define';

export class ShakaVideoElement extends ShakaVideo {
  static readonly tagName = 'shaka-video';
}

safeDefine(ShakaVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [ShakaVideoElement.tagName]: ShakaVideoElement;
  }
}
