import { DialogDescriptionElement } from '../../ui/dialog/dialog-description-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogDescriptionElement);

declare global {
  interface HTMLElementTagNameMap {
    'media-dialog-description': DialogDescriptionElement;
  }
}
