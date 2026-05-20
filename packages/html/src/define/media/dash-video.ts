import { DashVideo } from '../../media/dash-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<dash-video>` tag — DASH playback via dash.js. */
export class DashVideoElement extends DashVideo {
  /** Custom element tag name. */
  static readonly tagName = 'dash-video';
}

safeDefine(DashVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [DashVideoElement.tagName]: DashVideoElement;
  }
}
