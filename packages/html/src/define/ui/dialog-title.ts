import { safeDefine } from '../../registration/safe-define';
import { DialogTitleElement } from '../../ui/dialog/title';

safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-title': DialogTitleElement;
  }
}
