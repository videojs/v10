import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogElement } from '../../ui/alert-dialog/alert-dialog-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { safeDefine } from '../safe-define';

// Parent first — child elements consume its context.
safeDefine(AlertDialogElement);
safeDefine(AlertDialogCloseElement);
safeDefine(AlertDialogDescriptionElement);
safeDefine(AlertDialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogElement.tagName]: AlertDialogElement;
    [AlertDialogCloseElement.tagName]: AlertDialogCloseElement;
    [AlertDialogDescriptionElement.tagName]: AlertDialogDescriptionElement;
    [AlertDialogTitleElement.tagName]: AlertDialogTitleElement;
  }
}
