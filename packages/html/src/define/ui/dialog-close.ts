import { safeDefine } from '../../registration/safe-define';
import { DialogCloseElement } from '../../ui/dialog/dialog-close-element';

safeDefine(DialogCloseElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-close': DialogCloseElement;
  }
}
