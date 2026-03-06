import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { safeDefine } from '../safe-define';

safeDefine(AlertDialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogTitleElement.tagName]: AlertDialogTitleElement;
  }
}
