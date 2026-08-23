import { AlertDialogBackdropElement } from '../../ui/alert-dialog/alert-dialog-backdrop-element';
import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogPopupElement } from '../../ui/alert-dialog/alert-dialog-popup-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { defineErrorDialog } from './compounds';

defineErrorDialog();

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
    [AlertDialogBackdropElement.tagName]: AlertDialogBackdropElement;
    [AlertDialogPopupElement.tagName]: AlertDialogPopupElement;
    [AlertDialogCloseElement.tagName]: AlertDialogCloseElement;
    [AlertDialogDescriptionElement.tagName]: AlertDialogDescriptionElement;
    [AlertDialogTitleElement.tagName]: AlertDialogTitleElement;
  }
}
