import { AlertDialogBackdropElement } from '../../ui/alert-dialog/alert-dialog-backdrop-element';
import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogElement } from '../../ui/alert-dialog/alert-dialog-element';
import { AlertDialogPopupElement } from '../../ui/alert-dialog/alert-dialog-popup-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { safeDefine } from '../safe-define';

// Parent first — child elements consume its context.
safeDefine(AlertDialogElement);
safeDefine(AlertDialogBackdropElement);
safeDefine(AlertDialogPopupElement);
safeDefine(AlertDialogCloseElement);
safeDefine(AlertDialogDescriptionElement);
safeDefine(AlertDialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogElement.tagName]: AlertDialogElement;
    [AlertDialogBackdropElement.tagName]: AlertDialogBackdropElement;
    [AlertDialogPopupElement.tagName]: AlertDialogPopupElement;
    [AlertDialogCloseElement.tagName]: AlertDialogCloseElement;
    [AlertDialogDescriptionElement.tagName]: AlertDialogDescriptionElement;
    [AlertDialogTitleElement.tagName]: AlertDialogTitleElement;
  }
}
