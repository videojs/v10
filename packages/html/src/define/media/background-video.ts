import { BackgroundVideo } from '../../media/background-video';
import { safeDefine } from '../safe-define';

/** Custom element shell for the `<background-video>` tag — muted, looping, autoplaying ambient video. */
export class BackgroundVideoElement extends BackgroundVideo {
  /** Custom element tag name. */
  static readonly tagName = 'background-video';
}

safeDefine(BackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoElement.tagName]: BackgroundVideoElement;
  }
}
