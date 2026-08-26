import { DashVideoElement } from '../../media/dash-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(DashVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [DashVideoElement.tagName]: DashVideoElement;
  }
}
