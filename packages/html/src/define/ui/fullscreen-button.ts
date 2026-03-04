import { FullscreenButtonElement } from '../../ui/fullscreen-button/fullscreen-button-element';
import { safeDefine } from '../safe-define';

safeDefine(FullscreenButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [FullscreenButtonElement.tagName]: FullscreenButtonElement;
  }
}
