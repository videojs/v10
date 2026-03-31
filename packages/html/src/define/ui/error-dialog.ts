import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { safeDefine } from '../safe-define';

// Parent first — child elements consume its context.
safeDefine(ErrorDialogElement);
safeDefine(AlertDialogCloseElement);
safeDefine(AlertDialogDescriptionElement);
safeDefine(AlertDialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
  }
}
