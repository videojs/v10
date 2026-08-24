import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { DialogElement } from '../../ui/dialog/dialog-element';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogElement);
safeDefine(DialogCloseElement);
safeDefine(DialogDescriptionElement);
safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog': DialogElement;
    'media-dialog-close': DialogCloseElement;
    'media-dialog-description': DialogDescriptionElement;
    'media-dialog-title': DialogTitleElement;
  }
}
