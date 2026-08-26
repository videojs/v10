import { DialogPopupElement } from '../../ui/dialog/dialog-popup-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogPopupElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogPopupElement.tagName]: DialogPopupElement;
  }
}
