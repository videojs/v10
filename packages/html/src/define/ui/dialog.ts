import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogElement } from '../../ui/dialog/dialog-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogElement);
safeDefine(DialogBackdropElement);
safeDefine(DialogCloseElement);
safeDefine(DialogDescriptionElement);
safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogElement.tagName]: DialogElement;
    [DialogBackdropElement.tagName]: DialogBackdropElement;
    [DialogCloseElement.tagName]: DialogCloseElement;
    [DialogDescriptionElement.tagName]: DialogDescriptionElement;
    [DialogTitleElement.tagName]: DialogTitleElement;
  }
}
