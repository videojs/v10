import { PlayButtonElement } from '../../ui/play-button/play-button-element';
import { safeDefine } from '../safe-define';

safeDefine(PlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayButtonElement.tagName]: PlayButtonElement;
  }
}
