import { safeDefine } from '../../registration/safe-define';
import { FullscreenButtonElement } from '../../ui/fullscreen-button/fullscreen-button-element';

safeDefine(FullscreenButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [FullscreenButtonElement.tagName]: FullscreenButtonElement;
  }
}
