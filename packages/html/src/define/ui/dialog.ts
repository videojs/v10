import { safeDefine } from '../../registration/safe-define';
import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogElement } from '../../ui/dialog/dialog-element';
import { DialogPopupElement } from '../../ui/dialog/dialog-popup-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';

safeDefine(DialogElement);
safeDefine(DialogBackdropElement);
safeDefine(DialogPopupElement);
safeDefine(DialogCloseElement);
safeDefine(DialogDescriptionElement);
safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogElement.tagName]: DialogElement;
    [DialogBackdropElement.tagName]: DialogBackdropElement;
    [DialogPopupElement.tagName]: DialogPopupElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
