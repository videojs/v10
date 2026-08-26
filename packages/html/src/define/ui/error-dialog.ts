import { defineErrorDialog } from '../../registration/ui-compounds';
import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogPopupElement } from '../../ui/dialog/dialog-popup-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { ErrorDialogElement } from '../../ui/error-dialog/error-dialog-element';

defineErrorDialog();

declare global {
  interface HTMLElementTagNameMap {
    [ErrorDialogElement.tagName]: ErrorDialogElement;
    [DialogBackdropElement.tagName]: DialogBackdropElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogPopupElement.tagName]: DialogPopupElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
