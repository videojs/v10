import { TwitchVideo } from '../../media/twitch-video';
import { safeDefine } from '../../registration/safe-define';

export class TwitchVideoElement extends TwitchVideo {
  static readonly tagName = 'twitch-video';
}

safeDefine(TwitchVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [TwitchVideoElement.tagName]: TwitchVideoElement;
  }
}
