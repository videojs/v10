import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogCloseElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-close': DialogCloseElement;
  }
}
