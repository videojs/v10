import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { safeDefine } from '../safe-define';

safeDefine(AlertDialogCloseElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogCloseElement.tagName]: AlertDialogCloseElement;
  }
}
