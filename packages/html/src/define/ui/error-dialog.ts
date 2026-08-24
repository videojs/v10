import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';
import { defineErrorDialog } from './compounds';

defineErrorDialog();

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
