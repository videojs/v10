import { safeDefine } from '../../registration/safe-define';
import { DialogCloseElement } from '../../ui/dialog/close';

safeDefine(DialogCloseElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-close': DialogCloseElement;
  }
}
