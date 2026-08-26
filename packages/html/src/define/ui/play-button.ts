import { safeDefine } from '../../registration/safe-define';
import { PlayButtonElement } from '../../ui/play-button/play-button-element';

safeDefine(PlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayButtonElement.tagName]: PlayButtonElement;
  }
}
