import { AlertDialogCloseElement } from '../../ui/alert-dialog/alert-dialog-close-element';
import { AlertDialogDescriptionElement } from '../../ui/alert-dialog/alert-dialog-description-element';
import { AlertDialogTitleElement } from '../../ui/alert-dialog/alert-dialog-title-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { defineErrorDialog } from './compounds';

defineErrorDialog();

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
    [AlertDialogCloseElement.tagName]: AlertDialogCloseElement;
    [AlertDialogDescriptionElement.tagName]: AlertDialogDescriptionElement;
    [AlertDialogTitleElement.tagName]: AlertDialogTitleElement;
  }
}
