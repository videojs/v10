import { DashVideoElement } from '../../media/dash-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(DashVideoElement);

export { DashVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [DashVideoElement.tagName]: DashVideoElement;
  }
}
