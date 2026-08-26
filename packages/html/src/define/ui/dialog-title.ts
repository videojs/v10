import { safeDefine } from '../../registration/safe-define';
import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';

safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-title': DialogTitleElement;
  }
}
