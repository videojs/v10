import { DialogTitleElement } from '../../ui/dialog/dialog-title-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogTitleElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-title': DialogTitleElement;
  }
}
