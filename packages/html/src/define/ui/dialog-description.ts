import { safeDefine } from '../../registration/safe-define';
import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';

safeDefine(DialogDescriptionElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-description': DialogDescriptionElement;
  }
}
