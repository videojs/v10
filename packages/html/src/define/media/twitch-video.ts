import { TwitchVideoElement } from '../../media/twitch-video/element';
import { safeDefine } from '../../registration/safe-define';

safeDefine(TwitchVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [TwitchVideoElement.tagName]: TwitchVideoElement;
  }
}
