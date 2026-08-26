import { safeDefine } from '../../registration/safe-define';
import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';

safeDefine(DialogBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogBackdropElement.tagName]: DialogBackdropElement;
  }
}
