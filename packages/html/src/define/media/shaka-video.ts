import { ShakaVideoElement } from '../../media/shaka-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(ShakaVideoElement);

export { ShakaVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [ShakaVideoElement.tagName]: ShakaVideoElement;
  }
}
