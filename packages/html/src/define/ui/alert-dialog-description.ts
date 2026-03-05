import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { safeDefine } from '../safe-define';

safeDefine(AlertDialogDescriptionElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogDescriptionElement.tagName]: AlertDialogDescriptionElement;
  }
}
