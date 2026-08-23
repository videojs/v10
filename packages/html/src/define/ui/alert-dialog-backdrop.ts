import { AlertDialogBackdropElement } from '../../ui/alert-dialog/alert-dialog-backdrop-element';
import { safeDefine } from '../safe-define';

safeDefine(AlertDialogBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogBackdropElement.tagName]: AlertDialogBackdropElement;
  }
}
