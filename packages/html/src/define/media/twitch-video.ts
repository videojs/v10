import { TwitchVideoElement } from '../../media/twitch-video';
import { safeDefine } from '../../registration/safe-define';

safeDefine(TwitchVideoElement);

export { TwitchVideoElement };

declare global {
  interface HTMLElementTagNameMap {
    [TwitchVideoElement.tagName]: TwitchVideoElement;
  }
}
