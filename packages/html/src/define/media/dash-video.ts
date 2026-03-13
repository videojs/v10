import { DashVideo } from '../../media/dash-video';
import { safeDefine } from '../safe-define';

export class DashVideoElement extends DashVideo {
  static readonly tagName = 'dash-video';
}

safeDefine(DashVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [DashVideoElement.tagName]: DashVideoElement;
  }
}
