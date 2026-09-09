import { safeDefine } from '../../registration/safe-define';
import { DialogBackdropElement } from '../../ui/dialog/backdrop';

safeDefine(DialogBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogBackdropElement.tagName]: DialogBackdropElement;
  }
}
