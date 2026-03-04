import { MuteButtonElement } from '../../ui/mute-button/mute-button-element';
import { safeDefine } from '../safe-define';

safeDefine(MuteButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuteButtonElement.tagName]: MuteButtonElement;
  }
}
