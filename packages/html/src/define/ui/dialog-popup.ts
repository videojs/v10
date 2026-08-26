import { safeDefine } from '../../registration/safe-define';
import { DialogPopupElement } from '../../ui/dialog/dialog-popup-element';

safeDefine(DialogPopupElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogPopupElement.tagName]: DialogPopupElement;
  }
}
