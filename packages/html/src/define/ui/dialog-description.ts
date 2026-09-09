import { safeDefine } from '../../registration/safe-define';
import { DialogDescriptionElement } from '../../ui/dialog/description';

safeDefine(DialogDescriptionElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-description': DialogDescriptionElement;
  }
}
