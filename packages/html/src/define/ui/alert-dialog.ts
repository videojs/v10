import { AlertDialogElement } from '../../ui/alert-dialog/alert-dialog-element';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { safeDefine } from '../safe-define';

// Parent first — child elements consume its context.
safeDefine(AlertDialogElement);
safeDefine(DialogCloseElement);
safeDefine(DialogDescriptionElement);
safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [AlertDialogElement.tagName]: AlertDialogElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
