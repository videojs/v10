import { safeDefine } from '../../registration/safe-define';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';

safeDefine(ErrorDialogElement);

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
  }
}
