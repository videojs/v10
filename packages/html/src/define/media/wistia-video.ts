import { WistiaVideoElement } from '../../media/wistia-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(WistiaVideoElement);

export { WistiaVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [WistiaVideoElement.tagName]: WistiaVideoElement;
  }
}
