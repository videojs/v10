import { DialogBackdropElement } from '../../ui/dialog/dialog-backdrop-element';
import { safeDefine } from '../safe-define';

safeDefine(DialogBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogBackdropElement.tagName]: DialogBackdropElement;
  }
}
