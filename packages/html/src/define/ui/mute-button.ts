import { safeDefine } from '../../registration/safe-define';
import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';

safeDefine(MuteButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuteButtonElement.tagName]: MuteButtonElement;
  }
}
