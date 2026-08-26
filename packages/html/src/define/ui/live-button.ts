import { safeDefine } from '../../registration/safe-define';
import { LiveButtonElement } from '../../ui/live-button/live-button-element';

safeDefine(LiveButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveButtonElement.tagName]: LiveButtonElement;
  }
}
