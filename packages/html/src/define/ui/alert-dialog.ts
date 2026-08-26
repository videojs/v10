import { defineAlertDialog } from '../../registration/ui-compounds';
import { AlertDialogElement } from '../../ui/alert-dialog/alert-dialog-element';
import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogPopupElement } from '../../ui/dialog/dialog-popup-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';

defineAlertDialog();

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogElement.tagName]: AlertDialogElement;
    [DialogBackdropElement.tagName]: DialogBackdropElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogPopupElement.tagName]: DialogPopupElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
