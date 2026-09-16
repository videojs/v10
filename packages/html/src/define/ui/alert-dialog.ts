import { safeDefine } from '../../registration/safe-define';
import { AlertDialogElement } from '../../ui/alert-dialog/element';

safeDefine(AlertDialogElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogElement.tagName]: AlertDialogElement;
  }
}
