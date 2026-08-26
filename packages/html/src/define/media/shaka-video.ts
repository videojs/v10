import { ShakaVideoElement } from '../../media/shaka-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(ShakaVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [ShakaVideoElement.tagName]: ShakaVideoElement;
  }
}
