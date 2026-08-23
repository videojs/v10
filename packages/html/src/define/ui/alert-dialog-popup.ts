import { AlertDialogPopupElement } from '../../ui/alert-dialog/alert-dialog-popup-element';
import { safeDefine } from '../safe-define';

safeDefine(AlertDialogPopupElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogPopupElement.tagName]: AlertDialogPopupElement;
  }
}
